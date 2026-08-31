import {
  Activity,
  BarChart3,
  CalendarCheck,
  Cog,
  CreditCard,
  Database,
  FileText,
  GitBranch,
  MessageSquare,
  Rocket,
  ShieldCheck,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const counterItems = [
  { label: "POS Checkout", Icon: CreditCard },
  { label: "Transactions", Icon: FileText },
  { label: "Transfers", Icon: GitBranch },
  { label: "Reservations", Icon: CalendarCheck },
  { label: "Day End", Icon: Activity },
  { label: "VitaKiosk", Icon: Rocket },
];

const backOfficeOperations = [
  { label: "Follow-up", Icon: UserRound },
  { label: "Customer Purchase History", Icon: FileText },
  { label: "Telemarketing", Icon: MessageSquare },
  { label: "Receiving", Icon: Database },
  { label: "Movements", Icon: GitBranch },
  { label: "Branch Purchase Order", Icon: CreditCard },
  { label: "Branch Stock", Icon: Database },
  { label: "Poison", Icon: ShieldCheck },
];

const backOfficeMasterData = [
  { label: "Inventory", Icon: Database },
  { label: "Price Monitor", Icon: Zap },
  { label: "Members", Icon: UsersRound },
  { label: "Points", Icon: Activity },
  { label: "Promotions", Icon: Rocket },
  { label: "Campaigns", Icon: BarChart3 },
  { label: "Stock Clearance", Icon: Database },
  { label: "Reports", Icon: FileText },
];

const hqItems = [
  { label: "HQ Live", Icon: Activity },
  { label: "Promoter Sales", Icon: UsersRound },
  { label: "Purchase Order", Icon: CreditCard },
  { label: "Stock Clearance", Icon: Database },
  { label: "Wholesale", Icon: Rocket },
  { label: "Finance", Icon: BarChart3 },
  { label: "Wholesale Receiving", Icon: Database },
  { label: "Master Inventory", Icon: Database },
  { label: "Master Movement", Icon: GitBranch },
];

function LayerIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="erp-layer-item-icon" aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}

function LayerItem({ label, Icon }: { label: string; Icon: LucideIcon }) {
  return (
    <li>
      <LayerIcon Icon={Icon} />
      <span>{label}</span>
    </li>
  );
}

export function ErpOperationalLayersVisual() {
  return (
    <div
      className="erp-operational-layers-visual"
      data-component="ErpOperationalLayersVisual"
      aria-label="VitaFlow ERP operational layers visual"
    >
      <div className="erp-layer-orbit orbit-a" aria-hidden="true" />
      <div className="erp-layer-orbit orbit-b" aria-hidden="true" />
      <div className="erp-layer-top-tabs" aria-hidden="true">
        <span>
          <CreditCard size={25} />
          Counter
        </span>
        <span>
          <Cog size={25} />
          Back Office
        </span>
        <span>
          <BarChart3 size={25} />
          HQ
        </span>
      </div>

      <section className="erp-layer-board" aria-labelledby="erp-layer-title">
        <h3 id="erp-layer-title" className="sr-only">
          One VitaFlow ERP system with Counter, Back Office, and HQ layers
        </h3>

        <article className="erp-layer-column erp-layer-counter" aria-labelledby="erp-counter-title">
          <header>
            <span className="erp-layer-emblem">
              <CreditCard size={28} aria-hidden="true" />
            </span>
            <div>
              <h4 id="erp-counter-title">Counter</h4>
              <p>Frontline operations</p>
            </div>
          </header>
          <ul className="erp-layer-list is-vertical">
            {counterItems.map((item) => (
              <LayerItem key={item.label} {...item} />
            ))}
          </ul>
        </article>

        <article className="erp-layer-column erp-layer-back-office" aria-labelledby="erp-back-office-title">
          <header>
            <span className="erp-layer-emblem">
              <Cog size={28} aria-hidden="true" />
            </span>
            <div>
              <h4 id="erp-back-office-title">Back Office</h4>
              <p>Branch operations</p>
            </div>
          </header>
          <div className="erp-layer-group">
            <h5>Operations</h5>
            <ul className="erp-layer-list is-grid">
              {backOfficeOperations.map((item) => (
                <LayerItem key={item.label} {...item} />
              ))}
            </ul>
          </div>
          <div className="erp-layer-group">
            <h5>Master Data</h5>
            <ul className="erp-layer-list is-grid">
              {backOfficeMasterData.map((item) => (
                <LayerItem key={item.label} {...item} />
              ))}
            </ul>
          </div>
        </article>

        <article className="erp-layer-column erp-layer-hq" aria-labelledby="erp-hq-title">
          <header>
            <span className="erp-layer-emblem">
              <BarChart3 size={28} aria-hidden="true" />
            </span>
            <div>
              <h4 id="erp-hq-title">HQ & Buying</h4>
              <p>Strategic control</p>
            </div>
          </header>
          <ul className="erp-layer-list is-grid is-hq">
            {hqItems.map((item) => (
              <LayerItem key={item.label} {...item} />
            ))}
          </ul>
        </article>
      </section>

      <div className="erp-layer-caption">
        <Database size={27} aria-hidden="true" />
        <div>
          <strong>ONE SYSTEM. THREE OPERATIONAL LAYERS.</strong>
          <span>Connected. Trusted. Always in sync.</span>
        </div>
      </div>
    </div>
  );
}
