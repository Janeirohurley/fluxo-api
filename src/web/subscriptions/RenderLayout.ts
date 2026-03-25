export function renderLayout(title: string, body: string) {
  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          :root {
            --bg: #f7f4ef;
            --panel: #fffcf8;
            --panel-alt: #181312;
            --ink: #161616;
            --muted: #5f6167;
            --line: #d8d3cb;
            --accent: #1f1716;
            --accent-soft: #f0ebe4;
            --ok: #0f766e;
            --warn: #b45309;
            --bad: #b91c1c;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background:
              linear-gradient(90deg, rgba(33, 33, 33, 0.05) 0, rgba(33, 33, 33, 0.05) 1px, transparent 1px, transparent 12px),
              linear-gradient(180deg, #fbfaf7 0%, var(--bg) 100%);
            background-size: 12px 12px, auto;
            color: var(--ink);
          }
          a { color: var(--accent); }
          .shell { margin: 0 auto; padding: 28px 20px 72px; }
         
          .eyebrow {
            color: #7c6351;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-size: 0.76rem;
            font-weight: 700;
          }
          
          .hero h1 {
            margin: 12px 0 10px;  
            font-size: clamp(2.2rem, 4vw, 2.6rem);
            line-height: 1.06;
            letter-spacing: -0.04em;
          }
          .eyebrow-title{
           max-width: 80% !important;
            margin:auto !important;
             text-align: center;
          }

          
          .hero p {
            margin: 0;
            max-width: 760px;
            color: #4b5563;
            font-size: 1.02rem;
          } 
            
         .hero .para{
           max-width: 80% !important;
            margin:auto !important;
             text-align: center;
          }
          .switcher {
            display: inline-flex;
            gap: 6px;
            background: #f2efe9;
            border: 1px solid #d9d2c8;
            border-radius: 14px;
            padding: 5px;
            margin-top: 28px;
          }
          .switcher span {
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 0.88rem;
            color: #4b5563;
          }
          .switcher .active {
            background: #171413;
            color: #f9fafb;
            box-shadow: 0 8px 20px rgba(20, 16, 16, 0.18);
          }
          .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
          .card, .panel {
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 9px;
            padding: 24px;
            box-shadow: 0 18px 42px rgba(55, 38, 20, 0.05);
          }
          .card h3, .panel h2 { margin-top: 0; }
          .muted { color: var(--muted); }
          .pill {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 9px;
            background: var(--accent-soft);
            color: #5e3c1e;
            margin: 4px 8px 0 0;
            font-size: 0.88rem;
            line-height: 1.25;
          }
          form { display: grid; gap: 16px; }
          label { display: grid; gap: 8px; font-size: 0.96rem; }
          input, textarea {
            width: 100%;
            border: 1px solid #cbbba7;
            border-radius: 9px;
            padding: 12px 14px;
            font: inherit;
            background: #fffefb;
          }
          textarea { min-height: 120px; resize: vertical; }
          .modules-list { display: grid; gap: 12px; }
          .module-option {
            display: flex;
            align-items: start;
            gap: 12px;
            border: 1px solid var(--line);
            border-radius: 9px;
            padding: 14px;
            background: #fffefb;
          }
          .module-option input { width: auto; margin-top: 3px; }
          .module-option.disabled {
            opacity: 0.58;
            background: #f7f3ec;
          }
          .module-meta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .coming-soon {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 9px;
            background: #efe7da;
            color: #7c6351;
            font-size: 0.76rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .actions { display: flex; flex-wrap: wrap; gap: 12px; }
          button {
            border: none;
            border-radius: 9px;
            padding: 13px 18px;
            font: inherit;
            cursor: pointer;
            background: var(--accent);
            color: white;
          }
          button.secondary { background: #374151; }
          button.danger { background: #9f1239; }
          .notice {
            border-radius: 9px;
            padding: 14px 16px;
            margin-block: 16px;
            border: 1px solid transparent;
          }
          .notice.ok { background: #ecfdf5; border-color: #99f6e4; color: var(--ok); }
          .notice.bad { background: #fef2f2; border-color: #fecaca; color: var(--bad); }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95rem;
            min-width: 920px;
          }
          .table-wrap {
            overflow-x: auto;
            border: 1px solid #e7e0d6;
            border-radius: 12px;
            background: #fffefb;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          }
          th, td {
            text-align: left;
            padding: 12px 10px;
            border-bottom: 1px solid #e8dfd3;
            vertical-align: top;
          }
          th {
            background: #f7f2ea;
            color: #4b5563;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .stack { display: grid; gap: 8px; }
          .stack span {
            word-break: break-word;
          }
          .admin-summary {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 18px;
          }
          .admin-summary p {
            margin: 0;
          }
          .admin-empty {
            border: 1px dashed #d4cabd;
            border-radius: 12px;
            padding: 24px;
            background: #fcfaf7;
            color: #5f6167;
          }
          .admin-cards {
            display: none;
            gap: 16px;
          }
          .admin-card {
            border: 1px solid #e1dbd2;
            border-radius: 12px;
            padding: 16px;
            background: #fffefb;
            box-shadow: 0 10px 24px rgba(45, 32, 18, 0.05);
          }
          .admin-card-row {
            display: grid;
            gap: 6px;
            margin-bottom: 12px;
          }
          .admin-card-label {
            font-size: 0.76rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #7c6351;
            font-weight: 700;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 5px 10px;
            border-radius: 9px;
            font-size: 0.62rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 1px solid #d7d0c5;
            background: #f3eee6;
          }
          .status-badge.pending {
            color: #9a6700;
            background: #fff7db;
            border-color: #f3d98b;
          }
          .status-badge.approved {
            color: #0f766e;
            background: #ecfdf5;
            border-color: #99f6e4;
          }
          .status-badge.rejected {
            color: #b91c1c;
            background: #fef2f2;
            border-color: #fecaca;
          }
          .status-badge.provisioning {
            color: #1d4ed8;
            background: #eff6ff;
            border-color: #bfdbfe;
          }
          .status-badge.failed {
            color: #b91c1c;
            background: #fff1f2;
            border-color: #fecdd3;
          }
          .admin-action-form {
            display: grid;
            gap: 10px;
            margin-top: 10px;
          }
          .admin-action-form textarea {
            min-height: 90px;
          }
          .codebox {
            background: #111827;
            color: #f9fafb;
            border-radius: 9px;
            padding: 16px;
            font-family: 'Courier New', monospace;
            word-break: break-all;
          }
          .pricing-shell {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
            margin-top: 26px;
          }
          .pricing-card {
            position: relative;
            border-radius: 9px;
            border: 1px solid #d8d3cb;
            background: rgba(255, 255, 255, 0.9);
            padding: 18px 18px 16px;
            box-shadow: 0 16px 36px rgba(38, 29, 24, 0.07);
            display: flex;
            flex-direction: column;
            min-height: 100%;
          }
          .pricing-card.featured {
            background: linear-gradient(180deg, #6366f1, #a855f7);
            color: #f5f5f4;
            border-color: #221918;
            transform: translateY(-1px);
          }
          .pricing-card.featured .muted,
          .pricing-card.featured .pricing-note,
          .pricing-card.featured .feature-list li {
            color: #d4d4d8;
          }
          .pricing-label {
            font-size: 0.82rem;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #5c6066;
            margin-bottom: 8px;
          }
          .pricing-card.featured .pricing-label { color: #e6d8c9; }
          .pricing-title {
            margin: 0 0 8px;
            font-size: 1.2rem;
          }
          .pricing-note {
            margin: 0 0 18px !important;
            color: #52525b !important;
            min-height: 52px !important;
            font-size: 0.95rem !important;
          }
          .price-row {
            display: flex;
            align-items: flex-end;
            gap: 6px;
            margin-bottom: 16px;
          }
          .price-amount {
            font-size: 1.3rem;
            font-weight: 600;
            letter-spacing: -0.05em;
            color: #5c6066;
          }
          .price-unit {
            color: #5c6066;
            margin-bottom: 4px;
          }
          .pricing-card.featured .price-unit { color: #d4d4d8; }
          .feature-list {
            list-style: none;
            margin: 0;
            padding: 16px 0 0;
            border-top: 2px dotted rgba(60, 60, 60, 0.35);
           
            gap: 11px;
            flex: 1;
          }
          .feature-list li {
            color: #2f3136;
            padding-left: 26px;
            position: relative;
            padding-block:2px;
          }
          .feature-list li::before {
            content: '●';
            position: absolute;
            left: 0;
            top: -1px;
            color: #4b5563;
            font-size: 0.82rem;
          }
          .pricing-card.featured .feature-list li::before { color: #f4e6d6; }
          .pricing-cta {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            text-decoration: none;
            margin-top: 18px;
            background: #171413;
            color: #fff;
            border-radius: 9px;
            padding: 13px 16px;
            font-weight: 600;
          }
          .pricing-card.featured .pricing-cta {
            background: #f7f4ef;
            color: #171413;
          }
          .pricing-card.selected {
            outline: 2px solid #1f1716;
            outline-offset: 3px;
          }
          .portal-bottom {
            display: grid;
            grid-template-columns: 1.25fr 0.95fr;
            gap: 20px;
            margin-top: 28px;
          }
          .module-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .helper-list {
            display: grid;
            gap: 12px;
            margin-top: 16px;
          }
          .helper-item {
            border: 1px solid #e6ded2;
            border-radius: 9px;
            padding: 14px;
            background: #fffefb;
          }
          @media (max-width: 980px) {
            .pricing-shell,
            .portal-bottom {
              grid-template-columns: 1fr;
            }
            .hero {
              padding: 28px 24px 24px;
            }
          }
          @media (max-width: 860px) {
            .shell {
              padding-inline: 14px;
            }
            .table-wrap {
              display: none;
            }
            .admin-cards {
              display: grid;
            }
            .actions button {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="shell">${body}</div>
      </body>
    </html>
  `;
}