<script lang="ts">
	interface Props {
		status: string;
	}

	let { status }: Props = $props();

	/**
	 * Le statut porte un libelle ET une couleur : la couleur seule ne se lit pas
	 * en niveaux de gris, ni pour une personne daltonienne.
	 *
	 * Le vert et le rouge sont ici des statuts d interface, jamais des opinions
	 * politiques : c est le seul usage que le projet leur autorise.
	 */
	const NEUTRAL = 'bg-cream text-ink-soft border-ink/20';
	const PENDING_STEP = 'bg-warning/10 text-warning border-warning/30';
	const DONE = 'bg-success/10 text-success border-success/30';

	const LABELS: Record<string, { label: string; classes: string }> = {
		DRAFT: { label: 'Brouillon', classes: NEUTRAL },
		SCHEDULED: { label: 'Programmé', classes: PENDING_STEP },
		PUBLISHED: { label: 'Publié', classes: DONE },
		ARCHIVED: { label: 'Archivé', classes: NEUTRAL },
		PENDING: { label: 'En attente', classes: NEUTRAL },
		VALIDATED: { label: 'Vérifié', classes: PENDING_STEP },
		COMMITTED: { label: 'Importé', classes: DONE },
		REJECTED: { label: 'Refusé', classes: 'bg-danger/10 text-danger border-danger/30' }
	};

	const entry = $derived(LABELS[status] ?? { label: status, classes: NEUTRAL });
</script>

<span class="rounded-pill border px-3 py-1 text-sm font-semibold {entry.classes}">
	{entry.label}
</span>
