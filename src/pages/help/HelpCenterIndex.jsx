import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'

const STARTER_STEPS = [
  {
    step: '1',
    title: 'Préparer le référentiel',
    detail: 'Produits, catégories, unités, zones, paiements et dépenses doivent être vérifiés avant de facturer.',
  },
  {
    step: '2',
    title: 'Affecter les equipes',
    detail: 'Les administrateurs gèrent les utilisateurs, les zones et les camions. Les commerciaux travaillent ensuite avec leur propre liste clients.',
  },
  {
    step: '3',
    title: 'Ouvrir la journée terrain',
    detail: "Une session terrain rattache le commercial, la zone, le camion et les mouvements de stock de la journée.",
  },
  {
    step: '4',
    title: 'Suivre, corriger et exporter',
    detail: "La carte, les rapports, l'inventaire et les exports servent au pilotage et à l'audit de fin de journée.",
  },
]

const FAQ = [
  {
    question: 'Pourquoi un commercial ne voit pas tous les clients ?',
    answer: 'Par conception, seuls les admins, developpeurs et comptables ont une vision globale. Un commercial ne voit que les clients rattaches a son compte.',
  },
  {
    question: 'À quoi sert une session terrain ?',
    answer: 'Elle relie le camion, les chargements, les retours, le suivi GPS et les factures du commercial pour une journee donnee.',
  },
  {
    question: 'Ou regler les moyens de paiement et motifs de depense ?',
    answer: 'La page Configuration centralise maintenant les catalogues, les paiements, les dépenses, les intégrations cartographiques et les réglages système.',
  },
  {
    question: 'Comment signaler un bug ou demander une correction ?',
    answer: 'La page Support et signalements permet de remonter un problème avec la page concernée, la sévérité, le contexte navigateur et une description exploitable.',
  },
  {
    question: 'Où vérifier les événements en temps réel ?',
    answer: 'Le centre de notifications et la carte terrain montrent les remontées opérationnelles, les sessions, les alertes stock et les activités du mobile.',
  },
]

function GuideCard({ title, description, to, icon, cta = 'Ouvrir' }) {
  return (
    <Link
      to={to}
      className="card card-hover block"
      style={{ textDecoration: 'none' }}
    >
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

export default function HelpCenterIndex() {
  const { isAdmin, isFinance } = useAuth()

  const guides = [
    {
      title: 'Factures et paiements',
      description: 'Création, suivi des paiements, crédit client et impression document par document.',
      to: '/invoices',
      icon: 'fa-solid fa-file-invoice',
    },
    {
      title: 'Clients et portefeuille',
      description: 'Gestion des clients rattachés, historique et règles de visibilité par rôle.',
      to: '/customers',
      icon: 'fa-solid fa-users',
    },
    {
      title: 'Produits et minimums',
      description: 'Catalogues produits, stock minimum par référence et contrôles dépôt/camion.',
      to: '/products',
      icon: 'fa-solid fa-box-open',
    },
    {
      title: 'Support et signalements',
      description: 'Signalement des incidents, suivi des corrections et réponse de développement.',
      to: '/bug-reports',
      icon: 'fa-solid fa-bug',
      cta: 'Signaler',
    },
    {
      title: 'Notifications',
      description: 'Centre complet pour relire les événements et régler les préférences de notification.',
      to: '/notifications-center',
      icon: 'fa-solid fa-bell',
    },
  ]

  if (isAdmin()) {
    guides.push(
      {
        title: 'Camions et sessions',
        description: 'Affectation des camions, suivi des sessions ouvertes et stock terrain par commercial.',
        to: '/camions',
        icon: 'fa-solid fa-truck',
      },
      {
        title: 'Carte et terrain',
        description: 'Suivi clients, remontées GPS, dernier ping, stock embarqué et activité mobile.',
        to: '/map',
        icon: 'fa-solid fa-map-location-dot',
      },
      {
        title: 'Configuration modulaire',
        description: 'Catalogues, dépenses, intégrations cartographiques, e-mail support et informations système.',
        to: '/config',
        icon: 'fa-solid fa-sliders',
      },
      {
        title: 'Import / export',
        description: "Historique d'inventaire, imports CSV et exports globaux pour audit et partage.",
        to: '/data-tools',
        icon: 'fa-solid fa-file-arrow-up',
      },
    )
  }

  if (isFinance()) {
    guides.push({
      title: 'Crédit et dépenses',
      description: 'Vision finance, situation client, dépenses quotidiennes et rapports de profit.',
      to: '/expenses',
      icon: 'fa-solid fa-receipt',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aide et documentation"
        subtitle="Guides rapides, relations entre modules et questions fréquentes pour l’équipe web, API et terrain."
        action={(
          <Link to="/bug-reports" className="btn-secondary text-xs">
            <i className="fa-solid fa-bug" /> Signaler un problème
          </Link>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {STARTER_STEPS.map((item) => (
          <div key={item.step} className="card py-4 px-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold mb-3" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
              {item.step}
            </div>
            <div className="text-sm font-semibold text-base-color">{item.title}</div>
            <div className="text-sm text-secondary-color mt-2">{item.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {guides.map((guide) => (
          <GuideCard key={`${guide.title}-${guide.to}`} {...guide} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <i className="fa-solid fa-diagram-project text-teal-500" />
            <h2 className="text-sm font-semibold text-base-color">Comment les modules s’articulent</h2>
          </div>

          <div className="space-y-3 text-sm text-secondary-color">
            <p>
              Les produits, categories, moyens de paiement et motifs de depense sont la base commune.
              Ils alimentent les formulaires web, les imports, les exports et les ecrans mobiles.
            </p>
            <p>
              Les clients sont rattaches a un compte responsable. Les admins, developpeurs et comptables voient tout.
              Les commerciaux ne voient que leur portefeuille affecte et peuvent y ajouter de nouveaux clients.
            </p>
            <p>
              Une session terrain relie le commercial, la zone, le camion et les mouvements de stock. C’est aussi la clé
              pour relier les pings GPS, les factures du jour et le suivi cartographique.
            </p>
            <p>
              Les notifications, la carte et les rapports consomment ensuite ces événements pour afficher l’activité en temps réel
              et les synthèses de journée.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <i className="fa-solid fa-circle-question text-sky-500" />
            <h2 className="text-sm font-semibold text-base-color">FAQ</h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.question} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-sm font-semibold text-base-color">{item.question}</div>
                <div className="text-sm text-secondary-color mt-2">{item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
