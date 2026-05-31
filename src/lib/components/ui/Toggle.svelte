<script lang="ts">
	let {
		checked = false,
		onChange,
		ariaLabel,
		disabled = false
	}: {
		checked?: boolean;
		onChange?: (checked: boolean) => void;
		ariaLabel?: string;
		disabled?: boolean;
	} = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={ariaLabel}
	{disabled}
	class="toggle"
	class:on={checked}
	onclick={() => onChange?.(!checked)}
>
	<span class="knob"></span>
</button>

<style>
	.toggle {
		position: relative;
		flex-shrink: 0;
		width: 51px;
		height: 31px;
		padding: 0;
		border: none;
		border-radius: var(--radius-pill);
		background: var(--fill-secondary);
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-ios);
	}
	.toggle.on {
		background: var(--green-strong);
	}
	.toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 27px;
		height: 27px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		transition: transform var(--dur-fast) var(--ease-ios);
	}
	.toggle.on .knob {
		transform: translateX(20px);
	}
</style>
