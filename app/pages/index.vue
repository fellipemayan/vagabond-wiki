<script setup lang="ts">
import type { Locale } from '~/utils/i18n'

const { locale } = useWikiI18n()

interface WikiCounts {
  ancestries: number
  classes: number
  perks: number
  startingPacks: number
  armorWeapons: number
  items: number
  deliveries: number
  spells: number
  relics: number
  alchemicals: number
}

const COUNTS_QUERY = `{
  "ancestries": count(*[_type == "ancestry"]),
  "classes": count(*[_type == "class"]),
  "perks": count(*[_type == "perk"]),
  "startingPacks": count(*[_type == "gear" && "startingPack" in category]),
  "armorWeapons": count(*[_type == "gear" && ("weapon" in category || "armor" in category) && !coalesce(relic, "relic" in category, false)]),
  "items": count(*[_type == "gear" && !("startingPack" in category) && !("weapon" in category) && !("armor" in category) && !coalesce(relic, "relic" in category, false)]),
  "deliveries": count(*[_type == "spellDelivery"]),
  "spells": count(*[_type == "spell"]),
  "relics": count(*[_type == "gear" && coalesce(relic, "relic" in category, false)]),
  "alchemicals": count(*[_type == "alchemical"]),
}`

const { data: counts } = await useSanityQuery<WikiCounts>('wiki-home-counts', COUNTS_QUERY)

interface SectionCard {
  to: string
  title: Record<Locale, string>
  description: Record<Locale, string>
  countKey: keyof WikiCounts
}

interface SectionGroup {
  id: string
  title: Record<Locale, string>
  cards: SectionCard[]
}

const sections: SectionGroup[] = [
  {
    id: 'heroes',
    title: { pt: 'Heróis', en: 'Heroes' },
    cards: [
      {
        to: '/heroes/ancestries',
        title: { pt: 'Ancestralidades', en: 'Ancestries' },
        description: {
          pt: 'Povos, tamanhos, tipos de criatura e traços hereditários.',
          en: 'Peoples, sizes, creature types, and ancestral traits.',
        },
        countKey: 'ancestries',
      },
      {
        to: '/heroes/classes',
        title: { pt: 'Classes', en: 'Classes' },
        description: {
          pt: 'Arquétipos, perícias, progressão de conjuração e habilidades de nível.',
          en: 'Archetypes, trainings, spellcasting progression, and level features.',
        },
        countKey: 'classes',
      },
      {
        to: '/heroes/perks',
        title: { pt: 'Talentos', en: 'Perks' },
        description: {
          pt: 'Especializações, técnicas de combate e pré-requisitos.',
          en: 'Specializations, combat techniques, and prerequisites.',
        },
        countKey: 'perks',
      },
    ],
  },
  {
    id: 'gear',
    title: { pt: 'Equipamentos', en: 'Gear' },
    cards: [
    {
        to: '/gear/items',
        title: { pt: 'Itens', en: 'Items' },
        description: {
          pt: 'Ferramentas, suprimentos de aventura e itens alquímicos.',
          en: 'Tools, adventuring supplies, and alchemical items.',
        },
        countKey: 'items',
      },
      {
        to: '/gear/starting-packs',
        title: { pt: 'Pacotes Iniciais', en: 'Starting Packs' },
        description: {
          pt: 'Kits prontos para criação rápida de personagens.',
          en: 'Ready-to-use kits for quick character creation.',
        },
        countKey: 'startingPacks',
      },
      {
        to: '/gear/armor-weapons',
        title: { pt: 'Armas e Armaduras', en: 'Armor & Weapons' },
        description: {
          pt: 'Armamentos corpo a corpo, à distância, escudos e proteções.',
          en: 'Melee and ranged weapons, shields, and protective armor.',
        },
        countKey: 'armorWeapons',
      },
      {
        to: '/gear/alchemicals',
        title: { pt: 'Itens alquímicos', en: 'Alchemical items' },
        description: {
          pt: 'Lista de itens alquímicos e seus efeitos.',
          en: 'Alchemical items list and its effects.',
        },
        countKey: 'alchemicals',
      },
    ],
  },
  {
    id: 'magic',
    title: { pt: 'Magia', en: 'Spells' },
    cards: [
      // {
      //   to: '/magic/deliveries',
      //   title: { pt: 'Entregas de Magia', en: 'Spell Deliveries' },
      //   description: {
      //     pt: 'Formas de alcance, área e custo de mana para conjurações.',
      //     en: 'Range shapes, areas of effect, and mana costs for casting.',
      //   },
      //   countKey: 'deliveries',
      // },
      {
        to: '/magic/spells',
        title: { pt: 'Magias', en: 'Spells' },
        description: {
          pt: 'Encantamentos, danos base, efeitos e escalonamentos.',
          en: 'Incantations, base damage, effects, and scaling.',
        },
        countKey: 'spells',
      },
      // {
      //   to: '/magic/relics',
      //   title: { pt: 'Relíquias', en: 'Relics' },
      //   description: {
      //     pt: 'Artefatos mágicos e itens únicos de poder.',
      //     en: 'Magical artifacts and unique items of power.',
      //   },
      //   countKey: 'relics',
      // },
    ],
  },
]
</script>

<template>
  <div class="detail-page">
    <header class="home-hero">
      <h1 class="home-title">
        {{ locale === 'pt' ? 'Vagabond RPG' : 'Quick Reference — Vagabond RPG' }}
      </h1>
      <p class="home-subtitle">
        {{
          locale === 'pt'
            ? 'Compêndio pessoal de regras, opções de personagem, equipamentos e magias. Use a busca acima ou navegue pelas categorias abaixo.'
            : 'Personal compendium of rules, character options, gear, and spells. Use the search bar above or browse the categories below.'
        }}
      </p>
    </header>

    <div class="home-groups">
      <section v-for="group in sections" :key="group.id" class="home-group">
        <h2 class="group-heading">{{ group.title[locale] }}</h2>

        <div class="cards-grid">
          <NuxtLink
            v-for="card in group.cards"
            :key="card.to"
            :to="card.to"
            class="category-card"
          >
            <div class="card-top">
              <h3 class="card-title">{{ card.title[locale] }}</h3>
              <span v-if="counts" class="card-count">
                {{ counts[card.countKey] }}
              </span>
            </div>
            <p class="card-desc">{{ card.description[locale] }}</p>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.home-hero {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.home-title {
  margin: 0 0 0.4rem;
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.home-subtitle {
  margin: 0;
  color: var(--text-secondary);
}

.home-groups {
  min-height: 0;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
}

.group-heading {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent-primary);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16.5rem, 1fr));
  gap: 0.85rem;
}

.category-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.12s ease;
}

.category-card:hover {
  border-color: var(--accent-primary);
  background-color: var(--bg-hover);
  transform: translateY(-1px);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-count {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  background-color: var(--accent-subtle);
  color: var(--text-primary);
}

.card-desc {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.45;
}
</style>