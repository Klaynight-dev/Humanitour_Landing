<script lang="ts">
	interface Props {
		status: string;
	}

	let { status }: Props = $props();

	/**
	 * Le statut porte un libelle ET une couleur : la couleur seule ne se lit pas
	 * en niveaux de gris, ni pour une personne daltonienne.
	 */
	const LABELS: Record<string, { label: string; classes: string }> = {
		DRAFT: { label: 'Brouillon', classes: 'bg-paper text-muted border-ink' },
		SCHEDULED: { label: 'Programme', classes: 'bg-orange-50 text-orange-600 border-orange-600/20' },
		PUBLISHED: { label: 'Publie', classes: 'bg-coral-50 text-coral-700 border-coral-200' },
		ARCHIVED: { label: 'Archive', classes: 'bg-paper text-muted border-ink' },
		PENDING: { label: 'En attente', classes: 'bg-paper text-muted border-ink' },
		VALIDATED: { label: 'Verifie', classes: 'bg-orange-50 text-orange-600 border-orange-600/20' },
		COMMITTED: { label: 'Importe', classes: 'bg-coral-50 text-coral-700 border-coral-200' },
		REJECTED: { label: 'Refuse', classes: 'bg-danger/5 text-danger border-danger/20' }
	};

	const entry = $derived(LABELS[status] ?? { label: status, classes: 'bg-paper text-muted border-ink' });
</script>

<span class="rounded-pill border px-2.5 py-1 text-xs font-semibold {entry.classes}">
	{entry.label}
</span>
