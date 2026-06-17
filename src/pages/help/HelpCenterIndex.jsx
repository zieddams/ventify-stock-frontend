import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'

const STARTER_STEPS = [
  {
    step: '1',
    title: 'Preparer le referentiel',
    detail: 'Produits, categories, unites, zones, paiements et depenses doivent etre verifies avant de facturer.',
  },
  {
    step: '2',
    title: 'Affecter les equipes',
    detail: 'Les admins gerent les utilisateurs, les zones et les camions. Les commerciaux travaillent ensuite avec leur propre liste client.',
  },
  {
    step: '3',
    title: 'Ouvrir la journee terrain',
    detail: 'Une session terrain rattache le commercial, la zone, le camion et les mouvements de stock de la journee.',
  },
  {
    step: '4',
    title: 'Suivre, corriger et exporter',
    detail: 'La carte, les rapports, l inventaire et les exports servent au pilotage et a l audit de fin de journee.',
  },
]

const FAQ = [
  {
    question: 'Pourquoi un commercial ne voit pas tous les clients ?',
    answer: 'Par conception, seuls les admins, developpeurs et comptables ont une vision globale. Un commercial ne voit que les clients rattaches a son compte.',
  },
  {
    question: 'A quoi sert une session terrain ?',
    answer: 'Elle relie le camion, les chargements, les retours, le suivi GPS et les factures du commercial pour une journee donnee.',
  },
  {
    question: 'Ou regler les moyens de paiement et motifs de depense ?',
    answer: 'La page Configuration centralise maintenant les catalogues, les paiements, les depenses, les integrations carte et les reglages systeme.',
  },
  {
    question: 'Comment signaler un bug ou demander une correction ?',
    answer: 'La page Support & bugs permet de remonter un probleme avec la page concernee, la severite, le contexte navigateur et une description exploitable.',
  },
  {
    question: 'Ou verifier les evenements temps reel ?',
    answer: 'Le centre de notifications et la carte terrain montrent les remontees operationnelles, les sessions, les alertes stock et les activites du mobile.',
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
      title: 'Factures & paiements',
      description: 'Creation, suivi paiement, credit client et impression document par document.',
      to: '/invoices',
      icon: 'fa-solid fa-file-invoice',
    },
    {
      title: 'Clients & portefeuille',
      description: 'Gestion des clients rattaches, historique et regles de visibilite par role.',
      to: '/customers',
      icon: 'fa-solid fa-users',
    },
    {
      title: 'Produits & minimums',
      description: 'Catalogues produit, stock minimum par reference et controles depot/camion.',
      to: '/products',
      icon: 'fa-solid fa-box-open',
    },
    {
      title: 'Support & bugs',
      description: 'Signalement d incidents, suivi des corrections et reponse developpement.',
      to: '/bug-reports',
      icon: 'fa-solid fa-bug',
      cta: 'Signaler',
    },
    {
      title: 'Notifications',
      description: 'Centre complet pour relire les evenements et regler les preferences de notification.',
      to: '/notifications-center',
      icon: 'fa-solid fa-bell',
    },
  ]

  if (isAdmin()) {
    guides.push(
      {
        title: 'Camions & sessions',
        description: 'Affectation des camions, suivi des sessions ouvertes et stock terrain par commercial.',
        to: '/camions',
        icon: 'fa-solid fa-truck',
      },
      {
        title: 'Carte & terrain',
        description: 'Suivi clients, remontees GPS, dernier ping, stock embarque et activite mobile.',
        to: '/map',
        icon: 'fa-solid fa-map-location-dot',
      },
      {
        title: 'Configuration modulaire',
        description: 'Catalogues, depenses, integrations carte, email support et informations systeme.',
        to: '/config',
        icon: 'fa-solid fa-sliders',
      },
      {
        title: 'Import / export',
        description: 'Historique inventaire, imports CSV et exports globaux pour audit et partage.',
        to: '/data-tools',
        icon: 'fa-solid fa-file-arrow-up',
      },
    )
  }

  if (isFinance()) {
    guides.push({
      title: 'Credit & depenses',
      description: 'Vision finance, situation client, depenses quotidiennes et rapports profit.',
      to: '/expenses',
      icon: 'fa-solid fa-receipt',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aide & documentation"
        subtitle="Guides rapides, relations entre modules et questions frequentes pour l equipe web, API et terrain."
        action={(
          <Link to="/bug-reports" className="btn-secondary text-xs">
            <i className="fa-solid fa-bug" /> Signaler un probleme
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
            <h2 className="text-sm font-semibold text-base-color">Comment les modules se relient</h2>
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
              Une session terrain relie le commercial, la zone, le camion et les mouvements de stock. C est aussi la cle
              pour relier les pings GPS, les factures du jour et le suivi carte.
            </p>
            <p>
              Les notifications, la carte et les rapports consomment ensuite ces evenements pour afficher l activite en temps reel
              et les syntheses de journee.
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
