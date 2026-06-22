import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'

const SECTION_INDEX = [
  { id: 'overview', label: "Vue d'ensemble", icon: 'fa-solid fa-compass' },
  { id: 'operations', label: 'Référentiel et dépôt', icon: 'fa-solid fa-warehouse' },
  { id: 'roles', label: 'Rôles et accès', icon: 'fa-solid fa-user-shield' },
  { id: 'terrain', label: 'Sessions et camions', icon: 'fa-solid fa-route' },
  { id: 'finance', label: 'Facturation et finance', icon: 'fa-solid fa-file-invoice-dollar' },
  { id: 'support', label: 'Support et supervision', icon: 'fa-solid fa-life-ring' },
  { id: 'faq', label: 'FAQ rapide', icon: 'fa-solid fa-circle-question' },
]

const WORKFLOW_STEPS = [
  {
    title: '1. Préparer le référentiel',
    description: 'Produits, unités, zones, moyens de paiement, catégories de dépense et documents doivent être propres avant toute exploitation.',
  },
  {
    title: '2. Cadrer le dépôt',
    description: "Le dépôt actif donne le périmètre de travail. Le multi-dépôt reste un usage d'administration avancé.",
  },
  {
    title: '3. Ouvrir la session terrain',
    description: "Une session relie un commercial, un camion disponible, un chargement initial et l'activité du jour.",
  },
  {
    title: '4. Facturer, clôturer, auditer',
    description: 'Les factures, paiements, crédits, retours, exports et notifications doivent tous raconter la même journée.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'Pourquoi un commercial ne voit-il pas tous les clients ?',
    answer: "Parce que le portefeuille client est filtré par affectation. Les profils admin, développeur et comptable gardent une vision plus large.",
  },
  {
    question: 'Pourquoi la carte semble-t-elle limitée ?',
    answer: "La géolocalisation détaillée est volontairement en pause dans cette phase. Le suivi terrain reste basé sur les sessions, camions, recharges, factures et notifications.",
  },
  {
    question: 'Où régler les documents, impressions et champs PDF ?',
    answer: "Depuis le hub Configuration, section Documents PDF et impression, avec un paramétrage par entité.",
  },
  {
    question: "Où retrouver l'historique des imports et exports ?",
    answer: "Dans Outils de données, onglet Historique. La page fusionne les traces locales du navigateur et l'historique remonté par le serveur.",
  },
  {
    question: 'Pourquoi certains écrans ne montrent plus un sélecteur de dépôt ?',
    answer: "Quand un seul dépôt actif est exploitable, l'interface l'applique directement pour éviter un filtre inutile.",
  },
  {
    question: 'Qui peut lancer la maintenance ou un fresh install ?',
    answer: "Le rôle développeur uniquement. Ce sont des actions sensibles d'environnement, pas des opérations métier courantes.",
  },
]

function QuickLinkCard({ title, description, to, icon, cta = 'Ouvrir' }) {
  return (
    <Link to={to} className="card card-hover block" style={{ textDecoration: 'none' }}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
        >
          <i className={icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-base-color">{title}</div>
          <div className="text-sm text-secondary-color mt-1">{description}</div>
          <div className="text-xs font-semibold mt-3" style={{ color: '#0d9488' }}>
            {cta} <i className="fa-solid fa-arrow-right ml-1" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function DocAsideLink({ section }) {
  return (
    <a
      href={`#${section.id}`}
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-2"
      style={{ color: 'var(--secondary)' }}
    >
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(13,148,136,0.10)', color: '#0d9488' }}
      >
        <i className={`${section.icon} text-xs`} />
      </span>
      <span className="font-medium">{section.label}</span>
    </a>
  )
}

function SectionShell({ id, eyebrow, title, description, children }) {
  return (
    <section id={id} className="card scroll-mt-24">
      <div className="max-w-3xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-color">{eyebrow}</div>
        <h2 className="text-xl font-bold text-base-color mt-2">{title}</h2>
        <p className="text-sm text-secondary-color mt-2">{description}</p>
      </div>
      <div className="mt-6">
        {children}
      </div>
    </section>
  )
}

function RoleCard({ title, description, bullets, tone = '#0d9488' }) {
  return (
    <div
      className="rounded-[24px] px-5 py-5 h-full"
      style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="text-sm font-semibold text-base-color">{title}</div>
      <div className="text-sm text-secondary-color mt-2">{description}</div>
      <div className="space-y-2 mt-4">
        {bullets.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-secondary-color">
            <i className="fa-solid fa-check mt-1 text-xs" style={{ color: tone }} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoBullet({ children, color = '#0d9488', icon = 'fa-solid fa-circle-dot' }) {
  return (
    <div className="flex items-start gap-2 text-sm text-secondary-color">
      <i className={`${icon} mt-1 text-[10px]`} style={{ color }} />
      <span>{children}</span>
    </div>
  )
}

export default function HelpCenterIndex() {
  const { isAdmin, isFinance, isDeveloper } = useAuth()

  const quickLinks = [
    {
      title: 'Factures',
      description: 'Créer, consulter, imprimer et relire les factures avec leur contexte métier.',
      to: '/invoices',
      icon: 'fa-solid fa-file-invoice',
    },
    {
      title: 'Clients',
      description: "Suivre le portefeuille visible, les affectations et l'historique commercial.",
      to: '/customers',
      icon: 'fa-solid fa-users',
    },
    {
      title: 'Produits',
      description: 'Contrôler les références, les seuils minimums, le stock dépôt et les réappros rapides.',
      to: '/products',
      icon: 'fa-solid fa-box-open',
    },
    {
      title: 'Notifications',
      description: 'Relire les alertes métier, techniques et les événements récents de la plateforme.',
      to: '/notifications-center',
      icon: 'fa-solid fa-bell',
    },
  ]

  if (isAdmin()) {
    quickLinks.push(
      {
        title: 'Sessions terrain',
        description: 'Suivre les sorties du jour, les totaux vendus, le crédit et les clôtures.',
        to: '/routes',
        icon: 'fa-solid fa-route',
      },
      {
        title: 'Camions',
        description: 'Gérer les camions physiques, leur disponibilité et leur stock embarqué.',
        to: '/camions',
        icon: 'fa-solid fa-truck-fast',
      },
      {
        title: 'Configuration',
        description: 'Ouvrir le hub de configuration pour les catalogues, documents et tâches système.',
        to: '/config',
        icon: 'fa-solid fa-sliders',
      },
      {
        title: 'Outils de données',
        description: 'Importer, exporter et relire l’historique local et serveur des transferts.',
        to: '/data-tools',
        icon: 'fa-solid fa-file-arrow-up',
      },
    )
  }

  if (isFinance()) {
    quickLinks.push(
      {
        title: 'Crédit clients',
        description: 'Suivre les créances, les remboursements et les filtres par période.',
        to: '/credit',
        icon: 'fa-solid fa-credit-card',
      },
      {
        title: 'Dépenses',
        description: 'Piloter les dépenses, leurs catégories dynamiques et les vues de contrôle.',
        to: '/expenses',
        icon: 'fa-solid fa-receipt',
      },
    )
  }

  if (isDeveloper()) {
    quickLinks.push({
      title: 'Console développeur',
      description: 'Maintenance, fresh install, mode démo, diagnostics et outils sensibles.',
      to: '/developer-tools',
      icon: 'fa-solid fa-code',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre d'aide et documentation"
        subtitle="Référence fonctionnelle actuelle d'El Irtiwaa: dépôt, sessions, facturation, support, données et supervision."
        action={(
          <div className="flex flex-wrap gap-2">
            <Link to="/notifications-center" className="btn-secondary text-xs">
              <i className="fa-solid fa-bell" /> Notifications
            </Link>
            <Link to="/bug-reports" className="btn-primary text-xs">
              <i className="fa-solid fa-bug" /> Signaler un problème
            </Link>
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] gap-6 items-start">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="card">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-color mb-3">Sommaire</div>
            <div className="space-y-1">
              {SECTION_INDEX.map((section) => (
                <DocAsideLink key={section.id} section={section} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-semibold text-base-color">Actions utiles</div>
            <div className="text-sm text-secondary-color mt-2">
              Cette page résume la logique métier. Les raccourcis ci-dessous ouvrent directement les modules liés.
            </div>
            <div className="space-y-2 mt-4">
              {isAdmin() && (
                <>
                  <Link to="/config" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-sliders" /> Hub configuration
                  </Link>
                  <Link to="/data-tools" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-file-arrow-up" /> Outils de données
                  </Link>
                </>
              )}
              {isDeveloper() && (
                <Link to="/developer-tools" className="btn-secondary text-xs w-full justify-center">
                  <i className="fa-solid fa-code" /> Console développeur
                </Link>
              )}
              {!isAdmin() && isFinance() && (
                <Link to="/expenses" className="btn-secondary text-xs w-full justify-center">
                  <i className="fa-solid fa-receipt" /> Dépenses
                </Link>
              )}
              {!isAdmin() && !isFinance() && (
                <Link to="/customers" className="btn-secondary text-xs w-full justify-center">
                  <i className="fa-solid fa-users" /> Mes clients
                </Link>
              )}
              <Link to="/bug-reports" className="btn-secondary text-xs w-full justify-center">
                <i className="fa-solid fa-bug" /> Support
              </Link>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <QuickLinkCard key={`${link.title}-${link.to}`} {...link} />
            ))}
          </div>

          <SectionShell
            id="overview"
            eyebrow="Vue d'ensemble"
            title="Le flux réel est: référentiel -> dépôt -> session -> facture -> contrôle."
            description="Le système fonctionne correctement quand tous les modules racontent la même journée métier. La plateforme web, l'API et le mobile doivent rester alignés sur ce fil."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {WORKFLOW_STEPS.map((step) => (
                <div
                  key={step.title}
                  className="rounded-[24px] px-4 py-4"
                  style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                >
                  <div className="text-sm font-semibold text-base-color">{step.title}</div>
                  <div className="text-sm text-secondary-color mt-2">{step.description}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4 mt-5">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(13,148,136,0.06)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.14)' }}
              >
                <div className="text-sm font-semibold text-base-color">Ce qui pilote le reste du système</div>
                <div className="space-y-3 mt-3">
                  <InfoBullet>Le référentiel produit, les unités, zones, tarifs et moyens de paiement doivent être prêts avant toute session.</InfoBullet>
                  <InfoBullet>Le dépôt actif donne le périmètre de stock, d'export, de rapports et de pilotage quotidien.</InfoBullet>
                  <InfoBullet>Les imports et exports ont maintenant un historique local et serveur pour mieux auditer les opérations.</InfoBullet>
                  <InfoBullet>Les notifications, rapports et écrans terrain doivent toujours rester cohérents avec les données API.</InfoBullet>
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(59,130,246,0.06)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.12)' }}
              >
                <div className="text-sm font-semibold text-base-color">Points importants pour la phase actuelle</div>
                <div className="space-y-3 mt-3 text-sm text-secondary-color">
                  <p>Le suivi cartographique détaillé reste volontairement en pause. La page Carte sert surtout de point de reprise futur et n'est plus le cœur du pilotage.</p>
                  <p>Le mode multi-dépôt existe pour l'administration avancée, mais l'exploitation courante reste centrée sur le dépôt principal actif.</p>
                  <p>Les écrans doivent privilégier la lisibilité métier: moins de bruit technique, plus de statut opérationnel utile.</p>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="operations"
            eyebrow="Référentiel et dépôt"
            title="Le hub Configuration centralise les briques qui structurent toute l'application."
            description="Avant d'ouvrir le terrain, il faut d'abord garantir la qualité des données de base et des réglages communs."
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">Ce qui se règle dans le hub</div>
                <div className="space-y-2 mt-4">
                  <InfoBullet>Catégories produits, unités, zones et grilles métier du dépôt.</InfoBullet>
                  <InfoBullet>Méthodes de paiement avec scopes distincts pour la facturation client et les dépenses.</InfoBullet>
                  <InfoBullet>Catégories de dépenses dynamiques avec nom, couleur, icône et activation.</InfoBullet>
                  <InfoBullet>Documents PDF et impression par entité, avec sélection des champs visibles.</InfoBullet>
                  <InfoBullet>Support, utilisateurs, tâches de fond et informations système.</InfoBullet>
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(245,158,11,0.08)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.14)' }}
              >
                <div className="text-sm font-semibold text-base-color">Règles d'exploitation à garder en tête</div>
                <div className="space-y-2 mt-4">
                  <InfoBullet color="#f59e0b" icon="fa-solid fa-triangle-exclamation">
                    Un seul dépôt actif simplifie l'interface: plusieurs sélecteurs deviennent de simples labels informatifs.
                  </InfoBullet>
                  <InfoBullet color="#f59e0b" icon="fa-solid fa-triangle-exclamation">
                    Le minimum produit sert d'alerte métier. Il n'est pas décoratif et doit être défini proprement dès la création.
                  </InfoBullet>
                  <InfoBullet color="#f59e0b" icon="fa-solid fa-triangle-exclamation">
                    Les imports historiques doivent être relus dans l'onglet Historique pour confirmer ce qui a été traité côté serveur.
                  </InfoBullet>
                </div>
                {isAdmin() && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/config" className="btn-secondary text-xs">
                      <i className="fa-solid fa-sliders" /> Ouvrir le hub
                    </Link>
                    <Link to="/data-tools" className="btn-secondary text-xs">
                      <i className="fa-solid fa-file-arrow-up" /> Outils de données
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="roles"
            eyebrow="Rôles et accès"
            title="Les droits sont pensés pour éviter les erreurs de visibilité et de manipulation."
            description="L'interface filtre certains écrans, mais l'API applique aussi les règles de rôle pour garder le même comportement partout."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <RoleCard
                title="Administrateur"
                description="Pilote le métier et dispose d'une vision transversale."
                bullets={[
                  'Voit les clients, le stock, les sessions, les camions, les dépôts et la configuration métier.',
                  'Supervise les affectations, les contrôles quotidiens et les arbitrages opérationnels.',
                  "Travaille avec le développeur quand l'incident dépasse le simple usage métier.",
                ]}
              />
              <RoleCard
                title="Développeur"
                description="Dispose des droits admin et d'une console environnement supplémentaire."
                bullets={[
                  'Accède aux actions sensibles: maintenance, mode démo, fresh install et diagnostics.',
                  'Suit les tâches planifiées, les anomalies système et les outils de reprise.',
                  'Peut garder la main pendant une maintenance quand les autres rôles sont bloqués.',
                ]}
                tone="#8b5cf6"
              />
              <RoleCard
                title="Comptable"
                description="Se concentre sur les vues finance, le crédit et la consolidation."
                bullets={[
                  'Suit les dépenses, crédits clients, encaissements et synthèses utiles à la finance.',
                  'Ne pilote pas les outils développeur ni les actions de maintenance environnement.',
                  'Travaille sur des données consolidées plutôt que sur la configuration système brute.',
                ]}
                tone="#2563eb"
              />
              <RoleCard
                title="Commercial"
                description="Travaille surtout sur son portefeuille et sa session active."
                bullets={[
                  'Ne voit que les clients qui lui sont affectés, sauf règles métier prévues pour la création.',
                  'Crée ses factures dans le cadre de sa session et de son stock disponible.',
                  "N'a pas à gérer les réglages système, la maintenance ou le pilotage multi-dépôt.",
                ]}
                tone="#f97316"
              />
            </div>
          </SectionShell>

          <SectionShell
            id="terrain"
            eyebrow="Sessions et camions"
            title="La session terrain est l'objet qui relie le commercial, le camion, le stock et le chiffre du jour."
            description="Quand la session est propre, le web et le mobile restent cohérents. Quand elle est bancale, les ventes, recharges et clôtures deviennent difficiles à lire."
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">Ce qu'une session doit contenir</div>
                <div className="space-y-2 mt-4">
                  <InfoBullet>Un commercial clairement identifié pour la journée.</InfoBullet>
                  <InfoBullet>Un camion disponible, non déjà engagé dans une autre session incompatible.</InfoBullet>
                  <InfoBullet>Un chargement initial cohérent avec le stock réel du dépôt.</InfoBullet>
                  <InfoBullet>Des recharges et retours audités pour rapprocher camion, dépôt et ventes.</InfoBullet>
                  <InfoBullet>Une clôture avec synthèse exploitable: ventes, cash, crédit et retours.</InfoBullet>
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(14,165,233,0.06)', boxShadow: 'inset 0 0 0 1px rgba(14,165,233,0.12)' }}
              >
                <div className="text-sm font-semibold text-base-color">Synchronisation attendue</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  <p>Une session ouverte depuis le web ou depuis le mobile doit produire le même résultat métier pour le commercial concerné.</p>
                  <p>Les factures et encaissements mettent à jour les totaux vendus, le cash, le crédit et les lignes vendues de la session active.</p>
                  <p>La géolocalisation détaillée et la carte temps réel restent désactivées pour cette phase. Le suivi terrain reste donc centré sur les sessions, factures, recharges et notifications.</p>
                </div>
                {isAdmin() && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/routes" className="btn-secondary text-xs">
                      <i className="fa-solid fa-route" /> Voir les sessions
                    </Link>
                    <Link to="/camions" className="btn-secondary text-xs">
                      <i className="fa-solid fa-truck-fast" /> Voir les camions
                    </Link>
                    <Link to="/depot" className="btn-secondary text-xs">
                      <i className="fa-solid fa-warehouse" /> Stock dépôt
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="finance"
            eyebrow="Facturation et finance"
            title="Les modules finance relisent la relation client, le stock et la session qui porte la vente."
            description="Une facture fiable ne dépend pas seulement du formulaire: elle dépend aussi du client visible, du stock réellement disponible et du bon moyen de paiement."
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">Bonnes pratiques côté facture</div>
                <div className="space-y-2 mt-4">
                  <InfoBullet>Vérifier le client visible et son contexte de crédit avant validation.</InfoBullet>
                  <InfoBullet>Utiliser une méthode de paiement activée pour le bon scope: client ou dépense.</InfoBullet>
                  <InfoBullet>Relire le stock et les prix avant d'émettre un document depuis le web ou le mobile.</InfoBullet>
                  <InfoBullet>Conserver les mêmes filtres entre listing, impression et export pour éviter les écarts d'audit.</InfoBullet>
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(245,158,11,0.08)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.14)' }}
              >
                <div className="text-sm font-semibold text-base-color">Ce qui alimente la relecture finance</div>
                <div className="space-y-2 mt-4">
                  <InfoBullet color="#f59e0b" icon="fa-solid fa-sack-dollar">
                    Les sorties journalières remontent le total vendu, le bénéfice, le cash et le crédit.
                  </InfoBullet>
                  <InfoBullet color="#f59e0b" icon="fa-solid fa-credit-card">
                    Le module crédit suit la date, l'heure, la facture source et les échéances par période.
                  </InfoBullet>
                  <InfoBullet color="#f59e0b" icon="fa-solid fa-receipt">
                    Les dépenses utilisent un catalogue dynamique, séparé des paiements client.
                  </InfoBullet>
                </div>
                {isFinance() && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/credit" className="btn-secondary text-xs">
                      <i className="fa-solid fa-credit-card" /> Crédit
                    </Link>
                    <Link to="/expenses" className="btn-secondary text-xs">
                      <i className="fa-solid fa-receipt" /> Dépenses
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="support"
            eyebrow="Support et supervision"
            title="Le support ne sert pas seulement à signaler un bug: il sert à reconstruire le contexte de ce qui s'est passé."
            description="Notifications, signalements, tâches de fond et console développeur sont complémentaires. Ensemble, ils permettent de comprendre puis corriger."
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">Centre de support et notifications</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  <p>Un bon signalement doit contenir la page concernée, la sévérité, le contexte de reproduction et si possible les symptômes observés.</p>
                  <p>Le centre de notifications rassemble les événements métier et techniques utiles à la lecture quotidienne de la plateforme.</p>
                  <p>Les adresses de réception support sont verrouillées côté application pour éviter les dérives de configuration sur le serveur.</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link to="/bug-reports" className="btn-secondary text-xs">
                    <i className="fa-solid fa-bug" /> Ouvrir le support
                  </Link>
                  <Link to="/notifications-center" className="btn-secondary text-xs">
                    <i className="fa-solid fa-bell" /> Relire les notifications
                  </Link>
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(139,92,246,0.06)', boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.12)' }}
              >
                <div className="text-sm font-semibold text-base-color">Tâches de fond et outils sensibles</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  <p>Les tâches planifiées permettent de vérifier l'état des backups, synthèses, alertes stock et routines de nettoyage.</p>
                  <p>Le développeur seul peut lancer les actions de maintenance, de reprise environnement ou de fresh install.</p>
                  <p>Outils de données et console système servent aussi de garde-fou pour confirmer qu'une opération serveur a réellement abouti.</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {isAdmin() && (
                    <Link to="/config/background-tasks" className="btn-secondary text-xs">
                      <i className="fa-solid fa-clock-rotate-left" /> Tâches de fond
                    </Link>
                  )}
                  {isDeveloper() && (
                    <Link to="/developer-tools" className="btn-secondary text-xs">
                      <i className="fa-solid fa-code" /> Console développeur
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="faq"
            eyebrow="FAQ rapide"
            title="Questions fréquentes avant d'ouvrir un ticket."
            description="Cette section sert surtout à rappeler les règles de fonctionnement qui créent le plus souvent de la confusion."
          >
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[24px] px-5 py-5"
                  style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                >
                  <div className="text-sm font-semibold text-base-color">{item.question}</div>
                  <div className="text-sm text-secondary-color mt-2">{item.answer}</div>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </div>
  )
}
