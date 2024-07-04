<script lang="ts">
	import { evmKeyStore } from "$lib/stores"
	import { createWeb3ProviderEvmKeyStore } from "@chromia/ft4"

	async function connectMetamask() {
		if ($evmKeyStore) {
			evmKeyStore.set(undefined);
		} else if (window.ethereum) {
			// Create a keystore for holding the evm key
			const evmKs = await createWeb3ProviderEvmKeyStore(window.ethereum)
			evmKeyStore.set(evmKs)
		} else {
			window.alert(
				"This demo requires an EIP1193 provider like Metamask.\n"+
				"Please make sure you have one installed."
			)
		}
	}
</script>

<header>
	<div class="corner">
		<button on:click={connectMetamask}>
			{#if $evmKeyStore}
				Disconnect
			{:else}
				Connect Metamask
			{/if}
		</button>
	</div>
</header>

<style>
	header {
		display: flex;
		flex-direction: row-reverse;
		background-color: #222;
		padding: 1rem;
	}
	button {
		border: none;
		border-radius: 0.5rem;
		padding: 0.5rem;
		background-color: #ddd;
		color: #222;
	}
</style>
