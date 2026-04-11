import { getPublicEnv } from "@/env/public";
import { DASHBOARD_RECENT_ORDERS_LIMIT } from "@/features/dashboard/dashboard-contract";
import { getDashboardSnapshot } from "@/features/dashboard/get-dashboard-data";
import { projectConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
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

export default async function HomePage() {
  const publicEnv = getPublicEnv();
  const dashboard = await getDashboardSnapshot();
  const hasOrders = dashboard.totalOrders > 0;
  const operations = dashboard.operations;
  const kpis = [
    {
      label: "Всего заказов",
      value: String(dashboard.totalOrders),
      note: "Количество заказов в текущем срезе данных."
    },
    {
      label: "Общая выручка",
      value: formatCurrency(dashboard.totalRevenue, dashboard.currency),
      note: "Сумма всех заказов в текущем срезе."
    },
    {
      label: "Средний чек",
      value: formatCurrency(dashboard.averageOrderValue, dashboard.currency),
      note: "Средняя сумма заказа по текущим данным."
    },
    {
      label: `Крупные заказы (>= ${projectConfig.highValueOrderThreshold})`,
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

  return (
    <main className="page-shell">
      <header className="hero">
        <h1>{publicEnv.appName}</h1>
        <p>
          Компактный бизнес-дашборд по заказам: основные показатели, структура выручки и
          последние изменения по данным, собранным в текущем integration flow.
        </p>
        <div className="pill-row" aria-label="Реализованные возможности">
          {projectConfig.plannedCapabilities.map((item) => (
            <span className="pill" key={item}>
              {item}
            </span>
          ))}
        </div>
        <dl className="hero-meta">
          <div>
            <dt>Последняя активность</dt>
            <dd>{formatDate(dashboard.latestOrderMoment)}</dd>
          </div>
          <div>
            <dt>Снимок дашборда</dt>
            <dd>{formatDate(dashboard.generatedAt)}</dd>
          </div>
        </dl>
      </header>

      <section className="kpi-grid" aria-label="Ключевые показатели">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <p>{kpi.label}</p>
            <strong>{kpi.value}</strong>
            <span>{kpi.note}</span>
          </article>
        ))}
      </section>

      <section className="kpi-grid" aria-label="Операционный статус">
        {operationsKpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <p>{kpi.label}</p>
            <strong>{kpi.value}</strong>
            <span>{kpi.note}</span>
          </article>
        ))}
      </section>

      <section className="panel-list">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Операции</span>
              <h2>Что требует внимания</h2>
            </div>
            <span className="panel-caption">
              Последняя активность по алертам: {formatDate(operations.latestAlertActivity)}
            </span>
          </div>
          <div className="attention-list">
            {operations.attentionItems.map((item) => (
              <article className={`attention-card attention-${item.severity}`} key={item.title}>
                <div className="attention-heading">
                  <strong>{item.title}</strong>
                  <span>{item.severity === "critical" ? "Критично" : item.severity === "warning" ? "Внимание" : "Норма"}</span>
                </div>
                <p>{item.detail}</p>
                <p className="attention-action">{item.action}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Алерты</span>
              <h2>Последние notification events</h2>
            </div>
            <span className="panel-caption">
              Структурированный срез для оператора и AI-агента
            </span>
          </div>
          {operations.recentNotificationEvents.length > 0 ? (
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
                        <span>{event.orderExternalId}</span>
                      </div>
                    </td>
                    <td data-label="Статус заказа">{event.orderStatus}</td>
                    <td data-label="Статус алерта">
                      <div className="order-cell">
                        <strong>{formatNotificationStatus(event.notificationStatus)}</strong>
                        <span>{event.reason ?? "Без дополнительного комментария."}</span>
                      </div>
                    </td>
                    <td data-label="Сумма">{formatCurrency(event.totalAmount, event.currency)}</td>
                    <td data-label="Обновлен">{formatDate(event.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-copy">
              История alert-статусов пока пустая. После первого run здесь появится операционный след.
            </p>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Разбивка</span>
              <h2>По источникам</h2>
            </div>
            <span className="panel-caption">Группировка по `utm_source`</span>
          </div>
          {hasOrders ? (
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
                    <td data-label="Выручка">{formatCurrency(item.totalAmount, dashboard.currency)}</td>
                    <td data-label="Доля">{item.sharePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-copy">
              Синхронизированных заказов пока нет, поэтому разбивка по источникам пустая.
            </p>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Разбивка</span>
              <h2>По городам</h2>
            </div>
            <span className="panel-caption">Группировка по `city`</span>
          </div>
          {hasOrders ? (
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
                    <td data-label="Выручка">{formatCurrency(item.totalAmount, dashboard.currency)}</td>
                    <td data-label="Доля">{item.sharePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-copy">
              Синхронизированных заказов пока нет, поэтому разбивка по городам пустая.
            </p>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Заказы</span>
              <h2>Последние заказы</h2>
            </div>
            <span className="panel-caption">
              Последние {DASHBOARD_RECENT_ORDERS_LIMIT} заказов по времени обновления у источника
            </span>
          </div>
          {hasOrders ? (
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
                        <span>{order.externalId}</span>
                      </div>
                    </td>
                    <td data-label="Статус">{order.status}</td>
                    <td data-label="Источник">{order.source}</td>
                    <td data-label="Город">{order.city}</td>
                    <td data-label="Сумма">{formatCurrency(order.totalAmount, order.currency)}</td>
                    <td data-label="Обновлен">{formatDate(order.orderMoment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-copy">
              В Supabase пока нет заказов, поэтому дашборд показывает пустое состояние.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
