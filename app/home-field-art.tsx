import styles from "./home-hub.module.css";

/** Original decorative vector art, kept crisp without a large image download. */
export function PowerLineBackdrop() {
  return (
    <svg className={styles.powerLines} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hub-lines-fade">
          <stop stopColor="#6EA2CA" stopOpacity="0.02" />
          <stop offset="0.56" stopColor="#6EA2CA" stopOpacity="0.19" />
          <stop offset="1" stopColor="#6EA2CA" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#hub-lines-fade)" strokeWidth="2">
        <path d="M-100 139 Q305 351 718 137 Q1031 293 1360 85 Q1530 172 1730 86" />
        <path d="M-100 170 Q305 382 718 168 Q1031 324 1360 116 Q1530 203 1730 117" />
        <path d="M-100 202 Q305 414 718 200 Q1031 356 1360 148 Q1530 235 1730 149" />
        <path d="M720 288 Q1040 428 1360 247 Q1530 344 1710 248" />
      </g>
      <g fill="#071D36" stroke="#477AA1" strokeOpacity="0.3" strokeWidth="2">
        <path d="M693 900 709 128 723 128 744 900Z" />
        <path d="M650 135H781V147H650ZM665 169H768V180H665ZM681 201H753V211H681Z" />
        <path d="M1331 900 1347 74H1361L1383 900Z" />
        <path d="M1288 84H1422V98H1288ZM1300 116H1410V129H1300ZM1311 148H1399V160H1311Z" />
        <path d="M1318 247H1393V258H1318Z" />
        <path d="M1561 900 1544 378H1559L1592 900Z" opacity="0.6" />
        <path d="M1511 389H1590V401H1511Z" opacity="0.6" />
      </g>
      <g stroke="#638CAE" strokeOpacity="0.45" strokeWidth="4">
        <path d="M661 135V124M718 135V124M772 135V124M675 169V158M757 169V158M692 201V190M744 201V190" />
        <path d="M1299 84V72M1356 84V72M1412 84V72M1312 116V104M1399 116V104M1323 148V136M1388 148V136" />
      </g>
      <g fill="#06192D" stroke="#467397" strokeWidth="1.5" strokeOpacity="0.45">
        <path d="M1374 207q-10-4-11-14l1-23q2-11 13-10l13 5 16-13 6 8-19 22-11-3-1 19 15 18-9 8-14-12-10 29-10-4Z" />
        <circle cx="1378" cy="145" r="11" />
        <path d="M1364 143q0-16 14-16t15 16Z" />
        <path d="M1355 198q25 16 48-1" fill="none" strokeWidth="4" />
      </g>
      <path d="M0 845 140 821 256 843 420 800 555 821 682 794 839 817 1020 772 1180 800 1370 748 1600 784V900H0Z" fill="#04172B" opacity="0.6" />
    </svg>
  );
}

export function FieldInstrumentArt() {
  return (
    <div className={styles.instrumentArt} aria-hidden="true">
      <svg viewBox="0 0 520 580" fill="none" focusable="false">
        <defs>
          <linearGradient id="hub-meter-case" x1="240" y1="260" x2="480" y2="540" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F3C85C" /><stop offset="1" stopColor="#BC8225" />
          </linearGradient>
          <linearGradient id="hub-manifold" x1="30" y1="110" x2="335" y2="340" gradientUnits="userSpaceOnUse">
            <stop stopColor="#214C69" /><stop offset="0.5" stopColor="#102E46" /><stop offset="1" stopColor="#061B2E" />
          </linearGradient>
          <linearGradient id="hub-lcd" x1="71" y1="148" x2="281" y2="226" gradientUnits="userSpaceOnUse">
            <stop stopColor="#BFE5D4" /><stop offset="1" stopColor="#7FB7A7" />
          </linearGradient>
          <radialGradient id="hub-field-glow">
            <stop stopColor="#4387B5" stopOpacity="0.32" /><stop offset="1" stopColor="#4387B5" stopOpacity="0" />
          </radialGradient>
          <filter id="hub-instrument-shadow" x="-40%" y="-25%" width="180%" height="180%">
            <feDropShadow dx="0" dy="20" stdDeviation="15" floodColor="#000C1D" floodOpacity="0.65" />
          </filter>
        </defs>
        <ellipse cx="274" cy="290" rx="245" ry="260" fill="url(#hub-field-glow)" />
        <g stroke="#8BB4D0" strokeOpacity="0.25">
          <path d="M34 97H98M34 97V155M453 480H488V425M50 469H116" />
          <circle cx="256" cy="278" r="204" strokeDasharray="3 12" />
          <path d="M28 278H46M470 278H488M256 51V69M256 487V505" />
        </g>
        {/* Hoses stay behind the instruments, with the blue and red service sides distinct. */}
        <g strokeLinecap="round">
          <path d="M107 295C103 363 16 387 42 463C62 521 174 502 192 437" stroke="#06192E" strokeWidth="17" />
          <path d="M107 295C103 363 16 387 42 463C62 521 174 502 192 437" stroke="#287AB8" strokeWidth="10" />
          <path d="M179 294C172 352 129 371 147 411C166 450 235 432 246 477" stroke="#06192E" strokeWidth="17" />
          <path d="M179 294C172 352 129 371 147 411C166 450 235 432 246 477" stroke="#D7AC42" strokeWidth="10" />
          <path d="M250 295C281 356 444 326 472 416C491 481 443 524 388 526" stroke="#06192E" strokeWidth="17" />
          <path d="M250 295C281 356 444 326 472 416C491 481 443 524 388 526" stroke="#CE3843" strokeWidth="10" />
        </g>
        {/* Digital refrigerant manifold, with a hanging hook and two valve wheels. */}
        <g transform="rotate(-8 180 207)" filter="url(#hub-instrument-shadow)">
          <path d="M167 114V83C167 60 197 55 204 75C207 83 202 91 196 94" stroke="#82A2B5" strokeWidth="9" strokeLinecap="round" />
          <rect x="158" y="105" width="38" height="24" rx="6" fill="#173951" stroke="#7496AE" strokeWidth="2" />
          <path d="M64 118H286L305 139V269L283 291H65L46 269V139Z" fill="url(#hub-manifold)" stroke="#7292A8" strokeWidth="2" />
          <path d="M64 130H286M59 255V145M291 145V255" stroke="#D3E2E9" strokeOpacity="0.25" strokeWidth="2" />
          <rect x="69" y="145" width="212" height="94" rx="8" fill="#021B28" stroke="#425F70" strokeWidth="3" />
          <rect x="76" y="152" width="198" height="80" rx="4" fill="url(#hub-lcd)" />
          <g fill="#183E3A" fontFamily="monospace">
            <text x="87" y="168" fontSize="9" letterSpacing="1.5">LOW</text>
            <text x="195" y="168" fontSize="9" letterSpacing="1.5">HIGH</text>
            <text x="85" y="199" fontSize="28" fontWeight="700">118.6</text>
            <text x="186" y="199" fontSize="28" fontWeight="700">322.4</text>
            <text x="145" y="213" fontSize="8">psi</text><text x="245" y="213" fontSize="8">psi</text>
            <text x="87" y="222" fontSize="8" letterSpacing="1">R-410A</text>
            <text x="218" y="222" fontSize="8">°F</text>
          </g>
          <path d="M175 162V216" stroke="#1B4E42" strokeOpacity="0.35" />
          <g fill="#0A2235" stroke="#608196">
            <rect x="98" y="250" width="29" height="15" rx="5" />
            <rect x="142" y="250" width="29" height="15" rx="5" />
            <rect x="186" y="250" width="29" height="15" rx="5" />
            <rect x="230" y="250" width="25" height="15" rx="5" />
          </g>
          <path d="M152 258H160M156 254V262M198 255L202 258 198 261" stroke="#B4CCD8" strokeWidth="1.5" />
          <circle cx="111" cy="257" r="3" stroke="#B4CCD8" />
          <circle cx="243" cy="257" r="3" stroke="#B4CCD8" />
          <g fill="#B29250" stroke="#E5C77F" strokeWidth="1.5">
            <path d="M94 289H114V315H94ZM165 289H185V315H165ZM236 289H256V315H236Z" />
            <path d="M90 296H118M161 296H189M232 296H260" />
          </g>
          <g fill="#10283C" strokeWidth="5">
            <circle cx="40" cy="218" r="25" stroke="#459BCC" />
            <circle cx="310" cy="218" r="25" stroke="#DF4D52" />
          </g>
          <path d="M24 218H56M40 202V234" stroke="#459BCC" strokeWidth="5" strokeLinecap="round" />
          <path d="M294 218H326M310 202V234" stroke="#DF4D52" strokeWidth="5" strokeLinecap="round" />
          <g fill="#9AB3C4">
            <circle cx="61" cy="139" r="3" /><circle cx="289" cy="139" r="3" />
            <circle cx="61" cy="270" r="3" /><circle cx="289" cy="270" r="3" />
          </g>
          <text x="175" y="284" fill="#8EABB9" fontFamily="monospace" fontSize="8" letterSpacing="2" textAnchor="middle">TH3 · FIELD SERIES</text>
        </g>
        {/* Gold protective case, digital display, and selector dial distinguish the multimeter. */}
        <g transform="rotate(10 358 386)" filter="url(#hub-instrument-shadow)">
          <path d="M295 252H417L437 278V493L418 516H291L272 494V278Z" fill="url(#hub-meter-case)" stroke="#F7D77D" strokeWidth="2" />
          <path d="M297 266H414L422 282V483L409 499H299L286 483V282Z" fill="#0A2235" stroke="#213E50" strokeWidth="2" />
          <rect x="301" y="288" width="106" height="64" rx="5" fill="#021B28" stroke="#3D5C69" strokeWidth="2" />
          <rect x="307" y="294" width="94" height="52" rx="2" fill="url(#hub-lcd)" />
          <g fill="#183E3A" fontFamily="monospace">
            <text x="315" y="308" fontSize="8">AUTO</text>
            <text x="313" y="333" fontSize="30" fontWeight="700">24.6</text>
            <text x="388" y="340" fontSize="9">V</text>
          </g>
          <path d="M310 366H327M346 366H363M382 366H399" stroke="#537187" strokeWidth="7" strokeLinecap="round" />
          <circle cx="354" cy="418" r="39" fill="#041625" stroke="#3B586C" strokeWidth="2" />
          <path d="M319 396 325 400M354 377V384M387 396 381 400M391 433 384 430M317 433 323 430" stroke="#F0CE74" strokeWidth="2" />
          <circle cx="354" cy="418" r="27" fill="#193B50" stroke="#638092" strokeWidth="2" />
          <path d="M346 430 350 394 360 396 362 430Z" fill="#E1B94F" />
          <g fill="#8FA9BA" fontFamily="monospace" fontSize="8">
            <text x="312" y="385">OFF</text><text x="365" y="385">V</text><text x="396" y="417">Ω</text><text x="303" y="421">A</text>
          </g>
          <g fill="#041625" strokeWidth="3">
            <circle cx="319" cy="477" r="8" stroke="#738B9B" />
            <circle cx="354" cy="477" r="8" stroke="#738B9B" />
            <circle cx="390" cy="477" r="8" stroke="#CE3843" />
          </g>
          <path d="M354 479V503M390 479V503" stroke="#07182A" strokeWidth="7" />
          <path d="M390 479V503" stroke="#D43D43" strokeWidth="5" />
          <text x="354" y="279" fill="#9BB3C1" fontFamily="monospace" fontSize="7" letterSpacing="1.5" textAnchor="middle">TH3 · DIGITAL</text>
        </g>
        <path d="M347 516C321 567 454 567 462 506L481 365" stroke="#051528" strokeWidth="7" strokeLinecap="round" />
        <path d="M383 522C395 559 504 551 502 485L498 392" stroke="#C73540" strokeWidth="5" strokeLinecap="round" />
        <g transform="rotate(7 481 368)">
          <path d="M481 302V337" stroke="#BDCFD8" strokeWidth="3" />
          <path d="M481 337V397" stroke="#041625" strokeWidth="11" strokeLinecap="round" />
          <path d="M473 352H489" stroke="#45657B" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g transform="rotate(-6 498 400)">
          <path d="M498 337V365" stroke="#BDCFD8" strokeWidth="3" />
          <path d="M498 365V423" stroke="#D13B44" strokeWidth="9" strokeLinecap="round" />
          <path d="M491 378H505" stroke="#ED5960" strokeWidth="4" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
