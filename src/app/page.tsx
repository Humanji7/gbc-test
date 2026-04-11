import type { ReactNode } from "react";
import { getPublicEnv } from "@/env/public";
import { DASHBOARD_RECENT_ORDERS_LIMIT } from "@/features/dashboard/dashboard-contract";
import type { DashboardTrendPoint } from "@/features/dashboard/dashboard-snapshot";
import { getDashboardSnapshot } from "@/features/dashboard/get-dashboard-data";
import { projectConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

type PanelHeaderProps = Readonly<{
  caption: ReactNode;
  kicker: string;
  title: string;
}>;

type SectionIntroProps = Readonly<{
  description: string;
  kicker: string;
  title: string;
  titleId: string;
}>;

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatThreshold(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Нет данных";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatNotificationStatus(
  value: "sending" | "sent" | "failed" | "delivery_unknown"
): string {
  if (value === "sending") {
    return "В обработке";
  }

  if (value === "sent") {
    return "Доставлен";
  }

  if (value === "failed") {
    return "Ошибка";
  }

  return "Нужна ручная проверка";
}

function formatAttentionSeverity(value: "ok" | "warning" | "critical"): string {
  if (value === "critical") {
    return "Критично";
  }

  if (value === "warning") {
    return "Внимание";
  }

  return "Норма";
}

function getNotificationTone(
  value: "sending" | "sent" | "failed" | "delivery_unknown"
): "critical" | "warning" | "ok" {
  if (value === "failed") {
    return "critical";
  }

  if (value === "sending" || value === "delivery_unknown") {
    return "warning";
  }

  return "ok";
}

function SectionIntro({ description, kicker, title, titleId }: SectionIntroProps) {
  return (
    <div className="section-intro">
      <span className="section-kicker">{kicker}</span>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function PanelHeader({ caption, kicker, title }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <div>
        <span className="panel-kicker">{kicker}</span>
        <h3>{title}</h3>
      </div>
      <div className="panel-caption">{caption}</div>
    </div>
  );
}

function TableShell({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="table-shell">{children}</div>;
}

function OrderTrendChart({
  points,
  currency
}: Readonly<{
  points: DashboardTrendPoint[];
  currency: string;
}>) {
  if (points.length === 0) {
    return (
      <p className="empty-copy">
        После первого sync здесь появится график выручки по дням на основе Supabase-данных.
      </p>
    );
  }

  const leftPadding = 64;
  const rightPadding = 24;
  const topPadding = 22;
  const bottomPadding = 88;
  const chartHeight = 300;
  const plotHeight = chartHeight - topPadding - bottomPadding;
  const stepX = 82;
  const barWidth = 38;
  const viewBoxWidth = leftPadding + rightPadding + points.length * stepX;
  const maxAmount = Math.max(...points.map((point) => point.totalAmount), 1);
  const totalRevenue = points.reduce((sum, point) => sum + point.totalAmount, 0);
  const peakPoint = points.reduce((bestPoint, point) =>
    point.totalAmount > bestPoint.totalAmount ? point : bestPoint
  );
  const averageRevenue = totalRevenue / points.length;
  const gridFractions = [0.25, 0.5, 0.75, 1];

  return (
    <figure className="chart-shell">
      <dl className="chart-summary">
        <div>
          <dt>Активных дней</dt>
          <dd>{points.length}</dd>
        </div>
        <div>
          <dt>Пиковый день</dt>
          <dd>{peakPoint.label}</dd>
        </div>
        <div>
          <dt>Средняя дневная выручка</dt>
          <dd>{formatCurrency(averageRevenue, currency)}</dd>
        </div>
      </dl>

      <div className="chart-scroll">
        <svg
          aria-labelledby="orders-chart-title orders-chart-desc"
          className="trend-chart"
          role="img"
          viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}
        >
          <title id="orders-chart-title">Выручка по дням</title>
          <desc id="orders-chart-desc">
            Столбчатый график показывает дневную выручку по заказам, прочитанным из таблицы orders в
            Supabase.
          </desc>

          {gridFractions.map((fraction) => {
            const y = topPadding + plotHeight - plotHeight * fraction;

            return (
              <g key={fraction}>
                <line
                  className="chart-grid-line"
                  x1={leftPadding - 10}
                  x2={viewBoxWidth - rightPadding}
                  y1={y}
                  y2={y}
                />
                <text className="chart-y-axis-label" x={leftPadding - 16} y={y + 4}>
                  {formatCompactNumber(maxAmount * fraction)}
                </text>
              </g>
            );
          })}

          <line
            className="chart-baseline"
            x1={leftPadding - 10}
            x2={viewBoxWidth - rightPadding}
            y1={topPadding + plotHeight}
            y2={topPadding + plotHeight}
          />

          {points.map((point, index) => {
            const x = leftPadding + index * stepX;
            const barHeight = Math.max((point.totalAmount / maxAmount) * plotHeight, 10);
            const y = topPadding + plotHeight - barHeight;
            const labelX = x + barWidth / 2;
            const labelY = topPadding + plotHeight + 28;
            const amountY = topPadding + plotHeight + 54;

            return (
              <g key={point.isoDate}>
                <rect
                  className="chart-bar-track"
                  height={plotHeight}
                  rx={12}
                  ry={12}
                  width={barWidth}
                  x={x}
                  y={topPadding}
                />
                <rect
                  className="chart-bar"
                  height={barHeight}
                  rx={12}
                  ry={12}
                  width={barWidth}
                  x={x}
                  y={y}
                />
                <text className="chart-bar-value" x={labelX} y={Math.max(y - 10, 18)}>
                  {point.orderCount}
                </text>
                <text className="chart-axis-label" x={labelX} y={labelY}>
                  {point.label}
                </text>
                <text className="chart-axis-subtitle" x={labelX} y={amountY}>
                  {formatCompactNumber(point.totalAmount)} {currency}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className="chart-footnote">
        Число над столбцом показывает количество заказов, а подпись снизу показывает сумму за день.
        График собирается из Supabase-данных после sync и не требует сторонней chart-библиотеки.
      </figcaption>
    </figure>
  );
}

export default async function HomePage() {
  const publicEnv = getPublicEnv();
  const dashboard = await getDashboardSnapshot();
  const hasOrders = dashboard.totalOrders > 0;
  const operations = dashboard.operations;
  const kpis = [
    {
      label: "Всего заказов",
      value: String(dashboard.totalOrders),
      note: "Количество заказов в текущем серверном срезе."
    },
    {
      label: "Общая выручка",
      value: formatCurrency(dashboard.totalRevenue, dashboard.currency),
      note: "Сумма всех заказов, доступных в дашборде прямо сейчас."
    },
    {
      label: "Средний чек",
      value: formatCurrency(dashboard.averageOrderValue, dashboard.currency),
      note: "Средняя сумма заказа по синхронизированным данным."
    },
    {
      label: `Крупные заказы (> ${formatThreshold(projectConfig.highValueOrderThreshold)})`,
      value: String(dashboard.highValueOrders),
      note: "Заказы, которые сейчас попадают под Telegram-алерт."
    }
  ] as const;
  const operationsKpis = [
    {
      label: "Статус операций",
      value: operations.syncStatusLabel,
      note: "Короткий итог по sync и alert-состояниям."
    },
    {
      label: "Последний успешный sync",
      value: formatDate(operations.lastSuccessfulSyncAt),
      note: "Когда последний полный прогон был подтверждён как успешный."
    },
    {
      label: "delivery_unknown",
      value: String(operations.notificationCounts.deliveryUnknown),
      note: "Алерты, где возможна доставка без подтверждённой финализации."
    },
    {
      label: "failed + sending",
      value: `${operations.notificationCounts.failed} / ${operations.notificationCounts.sending}`,
      note: "Сначала ошибки, затем алерты, которые прямо сейчас в обработке."
    }
  ] as const;
  const heroFacts = [
    {
      label: "Последняя активность",
      value: formatDate(dashboard.latestOrderMoment),
      note: "По времени обновления заказа у источника."
    },
    {
      label: "Снимок дашборда",
      value: formatDate(dashboard.generatedAt),
      note: "Серверный рендер без клиентских секретов."
    },
    {
      label: "Порог Telegram-алерта",
      value: formatCurrency(projectConfig.highValueOrderThreshold, dashboard.currency),
      note: "Граница high-value flow для текущего проекта."
    }
  ] as const;

  return (
    <main className="page-shell" id="main-content">
      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Orders Control Surface</span>
          <h1>{publicEnv.appName}</h1>
          <p className="hero-lede">
            Спокойный операционный дашборд по заказам: основные KPI, дневная выручка, сигналы
            внимания и свежий срез по данным, которые приходят в текущем integration flow.
          </p>
          <div className="pill-row" aria-label="Реализованные возможности">
            {projectConfig.plannedCapabilities.map((item) => (
              <span className="pill" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <aside className="hero-aside" aria-label="Контекст текущего среза">
          {heroFacts.map((fact) => (
            <article className="hero-fact" key={fact.label}>
              <p className="hero-fact-label">{fact.label}</p>
              <strong className="hero-fact-value">{fact.value}</strong>
              <p className="hero-fact-note">{fact.note}</p>
            </article>
          ))}
        </aside>
      </header>

      <section aria-labelledby="business-overview-title" className="section-block">
        <SectionIntro
          description="Короткий верхний слой для быстрого чтения: объём, деньги, средний чек и high-value orders."
          kicker="Срез"
          title="Бизнес-показатели"
          titleId="business-overview-title"
        />
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <article className="kpi-card" key={kpi.label}>
              <p>{kpi.label}</p>
              <strong>{kpi.value}</strong>
              <span>{kpi.note}</span>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="operations-overview-title" className="section-block">
        <SectionIntro
          description="Операционный слой: sync, notification state и точки, где может понадобиться ручная проверка."
          kicker="Ops"
          title="Состояние процессов"
          titleId="operations-overview-title"
        />
        <div className="kpi-grid">
          {operationsKpis.map((kpi) => (
            <article className="kpi-card kpi-card-ops" key={kpi.label}>
              <p>{kpi.label}</p>
              <strong>{kpi.value}</strong>
              <span>{kpi.note}</span>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="core-views-title" className="section-block">
        <SectionIntro
          description="Главные экраны для ежедневного чтения: график, attention-блок и последние события по alert-цепочке."
          kicker="Экран"
          title="Аналитика и операции"
          titleId="core-views-title"
        />

        <div className="panel-grid panel-grid-primary">
          <article className="panel panel-emphasis">
            <PanelHeader
              caption={
                <>
                  Реальный Supabase-backed срез по таблице{" "}
                  <span className="inline-code" translate="no">
                    orders
                  </span>
                </>
              }
              kicker="График"
              title="Выручка по дням"
            />
            <OrderTrendChart currency={dashboard.currency} points={dashboard.orderTrend} />
          </article>

          <article className="panel panel-soft">
            <PanelHeader
              caption={
                <span className="status-chip" data-status={operations.syncStatus}>
                  {operations.syncStatusLabel}
                </span>
              }
              kicker="Операции"
              title="Что требует внимания"
            />
            <p className="panel-note">
              Последняя активность по алертам: {formatDate(operations.latestAlertActivity)}
            </p>
            <div className="attention-list">
              {operations.attentionItems.map((item) => (
                <article className="attention-card" data-severity={item.severity} key={item.title}>
                  <div className="attention-heading">
                    <strong>{item.title}</strong>
                    <span>{formatAttentionSeverity(item.severity)}</span>
                  </div>
                  <p>{item.detail}</p>
                  <p className="attention-action">{item.action}</p>
                </article>
              ))}
            </div>
          </article>
        </div>

        <div className="panel-grid panel-grid-secondary">
          <article className="panel">
            <PanelHeader
              caption={
                <>
                  Группировка по{" "}
                  <span className="inline-code" translate="no">
                    utm_source
                  </span>
                </>
              }
              kicker="Разбивка"
              title="По источникам"
            />
            {hasOrders ? (
              <TableShell>
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th scope="col">Источник</th>
                      <th scope="col">Заказы</th>
                      <th scope="col">Выручка</th>
                      <th scope="col">Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.sourceBreakdown.map((item) => (
                      <tr key={item.label}>
                        <td data-label="Источник">{item.label}</td>
                        <td data-label="Заказы">{item.orderCount}</td>
                        <td data-label="Выручка">
                          {formatCurrency(item.totalAmount, dashboard.currency)}
                        </td>
                        <td data-label="Доля">{item.sharePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            ) : (
              <p className="empty-copy">
                Синхронизированных заказов пока нет, поэтому разбивка по источникам пустая.
              </p>
            )}
          </article>

          <article className="panel">
            <PanelHeader
              caption={
                <>
                  Группировка по{" "}
                  <span className="inline-code" translate="no">
                    city
                  </span>
                </>
              }
              kicker="Разбивка"
              title="По городам"
            />
            {hasOrders ? (
              <TableShell>
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th scope="col">Город</th>
                      <th scope="col">Заказы</th>
                      <th scope="col">Выручка</th>
                      <th scope="col">Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.cityBreakdown.map((item) => (
                      <tr key={item.label}>
                        <td data-label="Город">{item.label}</td>
                        <td data-label="Заказы">{item.orderCount}</td>
                        <td data-label="Выручка">
                          {formatCurrency(item.totalAmount, dashboard.currency)}
                        </td>
                        <td data-label="Доля">{item.sharePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            ) : (
              <p className="empty-copy">
                Синхронизированных заказов пока нет, поэтому разбивка по городам пустая.
              </p>
            )}
          </article>

          <article className="panel panel-span-full">
            <PanelHeader
              caption="Структурированный след по Telegram-alert flow для оператора и AI-агента"
              kicker="Алерты"
              title="Последние alert-события"
            />
            {operations.recentNotificationEvents.length > 0 ? (
              <TableShell>
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th scope="col">Заказ</th>
                      <th scope="col">Статус заказа</th>
                      <th scope="col">Статус алерта</th>
                      <th scope="col">Сумма</th>
                      <th scope="col">Обновлен</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.recentNotificationEvents.map((event) => (
                      <tr key={`${event.orderExternalId}:${event.updatedAt}`}>
                        <td data-label="Заказ">
                          <div className="order-cell">
                            <strong>{event.orderNumber}</strong>
                            <span translate="no">{event.orderExternalId}</span>
                          </div>
                        </td>
                        <td data-label="Статус заказа">
                          <span className="table-token">{event.orderStatus}</span>
                        </td>
                        <td data-label="Статус алерта">
                          <div className="order-cell">
                            <strong>
                              <span
                                className="table-token"
                                data-tone={getNotificationTone(event.notificationStatus)}
                              >
                                {formatNotificationStatus(event.notificationStatus)}
                              </span>
                            </strong>
                            <span>{event.reason ?? "Без дополнительного комментария."}</span>
                          </div>
                        </td>
                        <td data-label="Сумма">
                          {formatCurrency(event.totalAmount, event.currency)}
                        </td>
                        <td data-label="Обновлен">{formatDate(event.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            ) : (
              <p className="empty-copy">
                История alert-статусов пока пустая. После первого run здесь появится операционный след.
              </p>
            )}
          </article>

          <article className="panel panel-span-full">
            <PanelHeader
              caption={`Последние ${DASHBOARD_RECENT_ORDERS_LIMIT} заказов по времени обновления у источника`}
              kicker="Заказы"
              title="Последние заказы"
            />
            {hasOrders ? (
              <TableShell>
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th scope="col">Заказ</th>
                      <th scope="col">Статус</th>
                      <th scope="col">Источник</th>
                      <th scope="col">Город</th>
                      <th scope="col">Сумма</th>
                      <th scope="col">Обновлен</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentOrders.map((order) => (
                      <tr key={order.externalId}>
                        <td data-label="Заказ">
                          <div className="order-cell">
                            <strong>{order.orderNumber}</strong>
                            <span translate="no">{order.externalId}</span>
                          </div>
                        </td>
                        <td data-label="Статус">
                          <span className="table-token">{order.status}</span>
                        </td>
                        <td data-label="Источник">{order.source}</td>
                        <td data-label="Город">{order.city}</td>
                        <td data-label="Сумма">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </td>
                        <td data-label="Обновлен">{formatDate(order.orderMoment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            ) : (
              <p className="empty-copy">
                В Supabase пока нет заказов, поэтому дашборд показывает пустое состояние.
              </p>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
