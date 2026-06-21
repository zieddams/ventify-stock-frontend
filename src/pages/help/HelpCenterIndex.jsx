import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'

const SECTION_INDEX = [
  { id: 'overview', label: "Vue d'ensemble", icon: 'fa-solid fa-compass' },
  { id: 'roles', label: 'Rôles et accès', icon: 'fa-solid fa-user-shield' },
  { id: 'terrain', label: 'Sessions et terrain', icon: 'fa-solid fa-route' },
  { id: 'billing', label: 'Facturation et finance', icon: 'fa-solid fa-file-invoice-dollar' },
  { id: 'support', label: 'Support et maintenance', icon: 'fa-solid fa-life-ring' },
  { id: 'faq', label: 'FAQ rapide', icon: 'fa-solid fa-circle-question' },
]

const OPERATING_STEPS = [
  {
    title: '1. Préparer la base métier',
    description: 'Vérifiez d’abord les produits, les unités, les zones, les moyens de paiement et les catégories de dépense.',
  },
  {
    title: '2. Organiser les équipes',
    description: 'Les administrateurs et développeurs gèrent les comptes, les camions, les sessions et les listes clients.',
  },
  {
    title: '3. Ouvrir le terrain',
    description: 'Une session relie un commercial, un camion, un stock embarqué, des pings GPS et les factures du jour.',
  },
  {
    title: '4. Suivre puis clôturer',
    description: 'La carte, les notifications, l’inventaire, les rapports et les exports servent au pilotage et à l’audit.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'Pourquoi un commercial ne voit-il pas tous les clients ?',
    answer: 'Parce que le portefeuille client est filtré par affectation. Les admins, développeurs et comptables gardent une vision globale.',
  },
  {
    question: 'À quoi sert une session terrain ?',
    answer: 'Elle centralise le camion, le commercial, le chargement initial, les mouvements de stock, le suivi GPS et les ventes de la journée.',
  },
  {
    question: 'Où régler les impressions, les exports et les catalogues ?',
    answer: 'La page Configuration centralise les catalogues, les documents, les dépenses, le support et les tâches système.',
  },
  {
    question: 'Comment signaler un bug exploitable ?',
    answer: "Utilisez la page Support et signalements avec le sujet, la zone concernée, la sévérité, l’URL et le contexte navigateur.",
  },
  {
    question: 'Qui peut activer la maintenance ou lancer un fresh install ?',
    answer: 'Seul le rôle développeur accède à la console développeur et aux actions sensibles de maintenance environnement.',
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
      <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(13,148,136,0.10)', color: '#0d9488' }}>
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

function RôleCard({ title, description, bullets, tone = '#0d9488' }) {
  return (
    <div className="rounded-[24px] px-5 py-5 h-full" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
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

export default function HelpCenterIndex() {
  const { isAdmin, isFinance, isDeveloper } = useAuth()

  const quickLinks = [
    {
      title: 'Factures et encaissements',
      description: 'Créer, régler, imprimer et suivre les factures au niveau ligne ou document complet.',
      to: '/invoices',
      icon: 'fa-solid fa-file-invoice',
    },
    {
      title: 'Clients et portefeuille',
      description: 'Suivre les clients visibles, les affectations par utilisateur et les droits de consultation.',
      to: '/customers',
      icon: 'fa-solid fa-users',
    },
    {
      title: 'Produits et dépôt',
      description: 'Vérifier les références, les minimums obligatoires, les stocks et les réappros rapides.',
      to: '/products',
      icon: 'fa-solid fa-box-open',
    },
    {
      title: 'Support et signalements',
      description: 'Signaler un incident avec le contexte technique pour accélérer le correctif.',
      to: '/bug-reports',
      icon: 'fa-solid fa-bug',
      cta: 'Signaler',
    },
  ]

  if (isAdmin()) {
    quickLinks.push(
      {
        title: 'Sessions terrain',
        description: 'Ouvrir, suivre et clôturer les sorties commerciales avec chargement et retours.',
        to: '/routes',
        icon: 'fa-solid fa-route',
      },
      {
        title: 'Carte et monitoring',
        description: 'Relire les pings GPS, l’activité terrain et les remontées mobiles en temps réel.',
        to: '/map',
        icon: 'fa-solid fa-map-location-dot',
      },
      {
        title: 'Configuration',
        description: 'Regrouper catalogues, documents, support et modules système dans un même hub.',
        to: '/config',
        icon: 'fa-solid fa-sliders',
      },
    )
  }

  if (isFinance()) {
    quickLinks.push({
      title: 'Dépenses et crédit',
      description: 'Suivre les dépenses quotidiennes, le crédit client et les vues finance du dépôt.',
      to: '/expenses',
      icon: 'fa-solid fa-receipt',
    })
  }

  if (isDeveloper()) {
    quickLinks.push({
      title: 'Console développeur',
      description: 'Maintenance, mode démo, fresh install, tâches serveur et diagnostic environnement.',
      to: '/developer-tools',
      icon: 'fa-solid fa-code',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre d'aide et documentation"
        subtitle="Une vue documentée du fonctionnement Irtiwaa : flux métier, rôles, terrain, finance, support et opérations système."
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
            <div className="text-sm font-semibold text-base-color">Besoin d'une action rapide ?</div>
            <div className="text-sm text-secondary-color mt-2">
              Utilisez la documentation pour comprendre le flux, puis ouvrez directement le module cible.
            </div>
            <div className="space-y-2 mt-4">
              {isAdmin() && (
                <>
                  <Link to="/config" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-sliders" /> Configuration
                  </Link>
                  <Link to="/data-tools" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-file-arrow-up" /> Imports / exports
                  </Link>
                </>
              )}
              {!isAdmin() && isFinance() && (
                <Link to="/expenses" className="btn-secondary text-xs w-full justify-center">
                  <i className="fa-solid fa-receipt" /> Depenses
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
            title="Le système s’organise autour d’un flux dépôt -> terrain -> facturation -> audit."
            description="Irtiwaa n’est pas une simple liste de pages. Chaque module alimente le suivant, et la qualité des données dépend surtout du respect de cet enchaînement."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {OPERATING_STEPS.map((step) => (
                <div key={step.title} className="rounded-[24px] px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <div className="text-sm font-semibold text-base-color">{step.title}</div>
                  <div className="text-sm text-secondary-color mt-2">{step.description}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4 mt-5">
              <div className="rounded-[24px] px-5 py-5" style={{ background: 'rgba(13,148,136,0.06)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.14)' }}>
                <div className="text-sm font-semibold text-base-color">Relations entre modules</div>
                <div className="space-y-3 mt-3 text-sm text-secondary-color">
                  <p>Les produits, unités, zones, paiements et catégories de dépense forment la base commune. Tant que cette base n’est pas propre, les sorties terrain, les factures et les impressions restent fragiles.</p>
                  <p>Les clients sont ensuite reliés aux comptes utilisateurs. Les commerciaux ne voient que leur portefeuille, alors que les profils de back-office gardent une vue complète pour le pilotage et l’audit.</p>
                  <p>Les sessions terrain servent de lien entre le camion, le stock embarqué, la position mobile, les réappros et les ventes de la journée.</p>
                </div>
              </div>

              <div className="rounded-[24px] px-5 py-5" style={{ background: 'rgba(59,130,246,0.06)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.12)' }}>
                <div className="text-sm font-semibold text-base-color">Points de contrôle quotidiens</div>
                <div className="space-y-2 mt-3 text-sm text-secondary-color">
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-circle-dot mt-1 text-[10px]" style={{ color: '#2563eb' }} />
                    <span>Vérifier les minimums stock et les réappros dépôt avant ouverture terrain.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-circle-dot mt-1 text-[10px]" style={{ color: '#2563eb' }} />
                    <span>Confirmer le camion, le commercial et les lignes de chargement lors de la session.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-circle-dot mt-1 text-[10px]" style={{ color: '#2563eb' }} />
                    <span>Relire la carte, les notifications et l'historique avant clôture de journée.</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="roles"
            eyebrow="Rôles et accès"
            title="Chaque rôle a un périmètre clair pour éviter les erreurs de visibilité."
            description="Les écrans ne suffisent pas : l’API applique aussi les règles de rôle pour garantir la cohérence entre web, mobile et automatisations."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <RôleCard
                title="Administrateur"
                description="Pilote les opérations et garde la vision globale métier."
                bullets={[
                  'Voit tous les clients, sessions, camions, dépôts et pages de configuration.',
                  'Peut gérer les utilisateurs, les affectations clients et les modules de stock.',
                  'Travaille avec le développeur sur les cas système ou les incidents majeurs.',
                ]}
              />
              <RôleCard
                title="Développeur"
                description="Dispose des droits admin et d’une console technique supplémentaire."
                bullets={[
                  'Accède seul aux outils développeur : maintenance, mode démo, fresh install et diagnostics.',
                  'Suit les bugs, les tâches planifiées et les verrous d’environnement.',
                  'Reste autorisé même quand une maintenance est activée.',
                ]}
                tone="#8b5cf6"
              />
              <RôleCard
                title="Comptable"
                description="Se concentre sur la finance et la consolidation."
                bullets={[
                  'Voit les clients, factures, crédits, dépenses et rapports utiles à la finance.',
                  'Ne pilote pas les outils techniques réservés aux admins et développeurs.',
                  'Participe au suivi des encaissements et des vues de synthèse.',
                ]}
                tone="#2563eb"
              />
              <RôleCard
                title="Commercial"
                description="Travaille surtout depuis le mobile et sur son portefeuille."
                bullets={[
                  "Ne voit que les clients qui lui sont affectés, sauf création d'un nouveau client.",
                  'Crée des factures terrain et remonte les pings GPS via la session active.',
                  'Dépend de la bonne configuration dépôt, produits et camion en amont.',
                ]}
                tone="#f97316"
              />
            </div>
          </SectionShell>

          <SectionShell
            id="terrain"
            eyebrow="Sessions et terrain"
            title="La session terrain est le point de synchronisation entre le mobile, le stock et la carte."
            description="Sans session propre, les positions, les mouvements et les ventes deviennent difficiles à relire ou à auditer."
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <div className="rounded-[24px] px-5 py-5" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-sm font-semibold text-base-color">Ce qu'une session doit toujours contenir</div>
                <div className="space-y-2 mt-4 text-sm text-secondary-color">
                  <div className="flex items-start gap-2"><i className="fa-solid fa-check text-xs mt-1 text-teal-500" /><span>Un commercial actif et clairement rattaché à la sortie du jour.</span></div>
                  <div className="flex items-start gap-2"><i className="fa-solid fa-check text-xs mt-1 text-teal-500" /><span>Un camion avec un statut exploitable et un chargement initial cohérent.</span></div>
                  <div className="flex items-start gap-2"><i className="fa-solid fa-check text-xs mt-1 text-teal-500" /><span>Des pings réguliers pour la carte, le monitoring et l’historique d’activité.</span></div>
                  <div className="flex items-start gap-2"><i className="fa-solid fa-check text-xs mt-1 text-teal-500" /><span>Des retours ou ajustements en fin de cycle pour rapprocher le terrain du dépôt.</span></div>
                </div>
              </div>

              <div className="rounded-[24px] px-5 py-5" style={{ background: 'rgba(14,165,233,0.06)', boxShadow: 'inset 0 0 0 1px rgba(14,165,233,0.12)' }}>
                <div className="text-sm font-semibold text-base-color">Lecture de la carte et du monitoring</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  <p>La carte terrain n’affiche utilement une position que si le mobile partage réellement sa localisation et que la session reste ouverte.</p>
                  <p>Les derniers pings, le heartbeat et l’activité récente servent à distinguer un vrai arrêt terrain d’une application simplement fermée ou hors réseau.</p>
                  <p>La page Carte, les widgets dashboard et les notifications doivent toujours raconter la même histoire. Si ce n'est pas le cas, il faut vérifier la session, puis le mobile, puis la file d'événements.</p>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="billing"
            eyebrow="Facturation et finance"
            title="Les modules finance relisent le dépôt, la session et la relation client."
            description="Une facture correcte dépend autant du portefeuille client que du stock et du contexte terrain dans lequel elle est émise."
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-[24px] px-5 py-5" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-sm font-semibold text-base-color">Bonnes pratiques facturation</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  <p>Avant validation, contrôlez le client, le mode de paiement, les prix actifs et la disponibilité réelle des produits.</p>
                  <p>Les impressions et exports utilisent les réglages documentaires. Si un champ manque sur un PDF, il faut d’abord vérifier la configuration des documents.</p>
                  <p>Le crédit, les paiements et les dépenses alimentent ensuite les vues finance et les rapports journaliers.</p>
                </div>
              </div>

              <div className="rounded-[24px] px-5 py-5" style={{ background: 'rgba(245,158,11,0.08)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.14)' }}>
                <div className="text-sm font-semibold text-base-color">Points d'attention</div>
                <div className="space-y-2 mt-4 text-sm text-secondary-color">
                  <div className="flex items-start gap-2"><i className="fa-solid fa-triangle-exclamation text-xs mt-1 text-amber-500" /><span>Un minimum produit par défaut n’interdit pas l’usage ; il sert à détecter les références sous seuil.</span></div>
                  <div className="flex items-start gap-2"><i className="fa-solid fa-triangle-exclamation text-xs mt-1 text-amber-500" /><span>Un stock nul ne devrait pas permettre de lancer un chargement incohérent sans vérification métier.</span></div>
                  <div className="flex items-start gap-2"><i className="fa-solid fa-triangle-exclamation text-xs mt-1 text-amber-500" /><span>Les listings paginés, impressions ligne à ligne et exports doivent rester alignés sur les mêmes filtres.</span></div>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="support"
            eyebrow="Support et maintenance"
            title="Le support mélange tickets utilisateurs, notifications système et gestes d’environnement."
            description="L'objectif n'est pas seulement de recevoir un bug, mais de pouvoir le relire, l'expliquer, le corriger et le verifier."
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <div className="rounded-[24px] px-5 py-5" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-sm font-semibold text-base-color">Centre de support</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  <p>Chaque signalement doit idéalement contenir un sujet clair, la page concernée, la sévérité et une description reproductible.</p>
                  <p>Les destinataires e-mail sont maintenant fixes cote application pour eviter les erreurs de configuration sur la prod.</p>
                  <p>Le ticket reste aussi dans le web app pour permettre un suivi, une réponse développeur et une clôture propre.</p>
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

              <div className="rounded-[24px] px-5 py-5" style={{ background: 'rgba(139,92,246,0.06)', boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.12)' }}>
                <div className="text-sm font-semibold text-base-color">Maintenance et operations sensibles</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  <p>La console développeur permet d'activer une maintenance globale ou seulement sur certaines pages, sans couper l'accès au rôle développeur.</p>
                  <p>Le fresh install réinitialise l'opérationnel tout en conservant la base métier : utilisateurs, produits, zones, camions et configurations.</p>
                  <p>Les tâches de fond, les snapshots système et les historiques d'exécution servent à vérifier rapidement si la prod suit bien le comportement attendu.</p>
                </div>
                {isDeveloper() && (
                  <div className="mt-4">
                    <Link to="/developer-tools" className="btn-secondary text-xs">
                      <i className="fa-solid fa-code" /> Ouvrir la console développeur
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="faq"
            eyebrow="FAQ rapide"
            title="Questions courantes à relire avant d'ouvrir un ticket."
            description="Cette section vise surtout à accélérer le diagnostic en rappelant les points de logique souvent oubliés."
          >
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="rounded-[24px] px-5 py-5" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
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
