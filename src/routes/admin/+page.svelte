<script lang="ts">
	import { listPlayers, listStaff, setPlayerRole } from "$lib/backend";
	import { _ } from "$lib/i18n";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import { getAgentAvatar } from "$lib/agentAvatars";
	import avatarPlaceholder from "$lib/assets/avatar-placeholder.webp";
	import { isAdmin } from "$lib/store";
	import type { PlayerListItem, PlayerRole, StaffMember } from "$lib/types";

	let staff = $state<StaffMember[]>([]);
	let players = $state<PlayerListItem[]>([]);
	let loading = $state(true);
	let busyUid = $state<string | null>(null);

	let searchQuery = $state("");
	let selectedUid = $state("");

	// Only regular players can be promoted — anyone already in the staff list is filtered out.
	let promotable = $derived(
		players.filter(
			(p) =>
				!staff.some((s) => s.uid === p.uid) &&
				p.name.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	$effect(() => {
		if (!promotable.some((p) => p.uid === selectedUid)) {
			selectedUid = promotable[0]?.uid ?? "";
		}
	});

	// Waits for $isAdmin (the role arrives after Firebase Auth restores the session).
	let loaded = false;
	$effect(() => {
		if ($isAdmin && !loaded) {
			loaded = true;
			Promise.all([listStaff(), listPlayers()])
				.then(([loadedStaff, loadedPlayers]) => {
					staff = loadedStaff;
					players = loadedPlayers;
				})
				.catch((error) => alert(error))
				.finally(() => (loading = false));
		}
	});

	async function changeRole(uid: string, name: string, role: PlayerRole) {
		const key = role === "moderator" ? "pageAdmin.promoteConfirm" : "pageAdmin.demoteConfirm";
		if (busyUid || !confirm($_(key, { values: { name } }))) return;

		busyUid = uid;
		try {
			await setPlayerRole(uid, role);
			staff = await listStaff();
		} catch (error) {
			alert(error);
		} finally {
			busyUid = null;
		}
	}

	function handlePromote() {
		const player = players.find((p) => p.uid === selectedUid);
		if (player) changeRole(player.uid, player.name, "moderator");
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if $isAdmin}
			<h2 class="page-title">{$_("pageAdmin.title")}</h2>

			<section>
				<h3 class="section-title">{$_("pageAdmin.rolesTitle")}</h3>

				<div class="promote-row">
					<span class="promote-label">{$_("pageAdmin.promoteLabel")}</span>
					<input
						type="text"
						class="search-input"
						placeholder={$_("pageAdmin.searchPlayerPlaceholder")}
						bind:value={searchQuery}
					/>
					<select bind:value={selectedUid} disabled={promotable.length === 0}>
						{#if promotable.length === 0}
							<option value="">{$_("pageAdmin.selectPlayer")}</option>
						{/if}
						{#each promotable as player (player.uid)}
							<option value={player.uid}>{player.name}</option>
						{/each}
					</select>
					<button
						class="btn-common btn-sm btn-success"
						class:btn-loading={busyUid !== null && busyUid === selectedUid}
						disabled={!selectedUid || busyUid !== null}
						onclick={handlePromote}
					>
						{$_("pageAdmin.promoteButton")}
					</button>
				</div>

				{#if loading}
					<p class="status">{$_("common.loading")}</p>
				{:else if staff.length === 0}
					<p class="notice">{$_("pageAdmin.empty")}</p>
				{:else}
					<div class="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>{$_("pageAdmin.nameColumn")}</th>
									<th>{$_("pageAdmin.roleColumn")}</th>
									<th class="align-right">{$_("pageAdmin.actionsColumn")}</th>
								</tr>
							</thead>
							<tbody>
								{#each staff as member (member.uid)}
									{@const avatar = getAgentAvatar(member.avatar)}
									<tr>
										<td>
											<div class="player-cell">
												<div
													class="player-avatar"
													style="background-image: {avatar ? 'none' : `url(${avatarPlaceholder})`}"
												>
													{#if avatar}
														<img src={avatar.src} alt={avatar.name} />
													{/if}
												</div>
												<span>{member.name}</span>
											</div>
										</td>
										<td>
											<span class="role-badge {member.role}">
												{member.role === "admin" ? $_("pageAdmin.roleAdmin") : $_("pageAdmin.roleModerator")}
											</span>
										</td>
										<td class="align-right">
											{#if member.role === "moderator"}
												<button
													class="btn-common btn-sm btn-danger-ghost"
													class:btn-loading={busyUid === member.uid}
													disabled={busyUid !== null}
													onclick={() => changeRole(member.uid, member.name, "player")}
												>
													{$_("pageAdmin.demoteButton")}
												</button>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{:else}
			<p class="notice">{$_("pageAdmin.noPermission")}</p>
		{/if}
	</div>
</div>

<style>
	.main-content {
		padding: 24px 28px;
		gap: 22px;
	}

	.page-title {
		font-size: 20px;
		padding-bottom: 16px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-dim);
		margin: 0 0 12px;
	}

	.promote-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 14px;
	}

	.promote-label {
		font-size: 12px;
		color: var(--text-dim);
	}

	.promote-row select {
		min-width: 160px;
		width: auto;
	}

	.player-cell {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.player-avatar {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background-color: var(--surface-2);
		background-size: cover;
		background-position: center;
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.player-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.role-badge {
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: var(--r-sm);
		border: 1px solid var(--border);
		color: var(--text-dim);
	}

	.role-badge.admin {
		border-color: var(--gold);
		color: var(--gold);
	}

	.align-right {
		text-align: right;
	}
</style>
