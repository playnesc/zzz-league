<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { handleDiscordCallback } from "$lib/discord";
	import { _ } from "$lib/i18n";
	import { getAuthSession } from "$lib/auth.svelte";

	const session = getAuthSession();

	let error = $state(false);
	let errorText = $state("");

	onMount(() => {
		async function init() {
			try {
				const linked = await handleDiscordCallback();
				if (linked) session.applyPlayerUpdate(linked);
				goto(resolve("/"));
			} catch (e: any) {
				error = true;
				errorText = e.message;
				setTimeout(function () {
					goto(resolve("/"));
				}, 3000);
			}
		}
		init();
	});
</script>

{#if error}
	<p class="error">{$_("pageDiscordCallback.errorLabel", { values: { error: errorText } })}</p>
	<p>{$_("pageDiscordCallback.redirecting")}</p>
{:else}
	<p>{$_("pageDiscordCallback.connecting")}</p>
{/if}
