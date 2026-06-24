export type KioskLanguage = "en" | "zh" | "ms";
export type PreferredLanguage = KioskLanguage | "auto";

export const LANGUAGE_STORAGE_KEY = "vitakiosk.language";

export const LANGUAGE_OPTIONS: Array<{ code: KioskLanguage; label: string }> = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "BM" },
];

export interface KioskTranslations {
  aiPharmacyAssistant: string;
  tapToSpeak: string;
  tapToStop: string;
  tryAgain: string;
  start: string;
  startNewCustomer: string;
  connected: string;
  localStateMode: string;
  mockMode: string;
  noCustomerData: string;
  product: string;
  productVerified: string;
  productSummary: string;
  enlargedProductDetails: string;
  enlargedProductSummary: string;
  ingredient: string;
  howToUse: string;
  bestFor: string;
  size: string;
  description: string;
  stock: string;
  branch: string;
  shelf: string;
  source: string;
  shelfNavigation: string;
  shelfNavigationMap: string;
  shortestRoute: string;
  unavailable: string;
  youAreHere: string;
  target: string;
  aisle: string;
  level: string;
  route: string;
  indoorPharmacyMap: string;
  pharmacistAssistance: string;
  requestAssistance: string;
  pharmacistRequested: string;
  typeYourQuestion: string;
  askPlaceholder: string;
  send: string;
  clear: string;
  closeDone: string;
  promotionLeaflet: string;
  enlargeLeaflet: string;
  promotion: string;
  campaign: string;
  mockVitaFlow: string;
  ready: string;
  listening: string;
  thinking: string;
  speaking: string;
  voiceAssistance: string;
  listeningSecurely: string;
  realtimeConnected: string;
  safetySupportCopy: string;
  freshSession: string;
  preparingAnswer: string;
  tapOnceToBegin: string;
  retryOrStart: string;
  escalationRequestedCopy: string;
  idleSubtitle: string;
  listeningSubtitle: string;
  thinkingSubtitle: string;
  errorSubtitle: string;
  escalationSubtitle: string;
  typingScreen: string;
  focusedTyping: string;
  keyboardGuidance: string;
  typingPlaceholder: string;
  space: string;
  backspace: string;
  done: string;
  openTypingScreen: string;
  productNotFound: string;
  readyForProductSearch: string;
  noProductGuess: string;
  askForProduct: string;
  currentProductPrice: string;
  vitaFlowErp: string;
  systemProvenance: string;
  data: string;
  mode: string;
  fictionalDemoData: string;
  clinicalSafety: string;
  pharmacistAvailable: string;
  safetyEscalationActive: string;
  requestPharmacistReview: string;
  safeHandoffOnly: string;
}

export const translations: Record<KioskLanguage, KioskTranslations> = {
  en: {
    aiPharmacyAssistant: "AI Pharmacy Assistant",
    tapToSpeak: "Tap to Speak",
    tapToStop: "Tap to Stop",
    tryAgain: "Try Again",
    start: "Start",
    startNewCustomer: "Start New Customer",
    connected: "Connected",
    localStateMode: "Local state mode",
    mockMode: "Mock mode",
    noCustomerData: "No customer data",
    product: "Product",
    productVerified: "Product Verified",
    productSummary: "Product summary",
    enlargedProductDetails: "Enlarged product details",
    enlargedProductSummary: "Enlarged product summary",
    ingredient: "Ingredient",
    howToUse: "How to use",
    bestFor: "Best for",
    size: "Size",
    description: "Description",
    stock: "Stock",
    branch: "Branch",
    shelf: "Shelf",
    source: "Source",
    shelfNavigation: "Shelf navigation",
    shelfNavigationMap: "Shelf navigation map",
    shortestRoute: "Shortest route",
    unavailable: "Unavailable",
    youAreHere: "You are here",
    target: "Target",
    aisle: "Aisle",
    level: "Level",
    route: "Route",
    indoorPharmacyMap: "Indoor pharmacy map",
    pharmacistAssistance: "Pharmacist assistance",
    requestAssistance: "Request assistance",
    pharmacistRequested: "Pharmacist Requested",
    typeYourQuestion: "Type your question",
    askPlaceholder: "Ask about a product, stock, promotion, or shelf location",
    send: "Send",
    clear: "Clear",
    closeDone: "Close / Done",
    promotionLeaflet: "Promotion Leaflet",
    enlargeLeaflet: "Enlarge Leaflet",
    promotion: "Promotion",
    campaign: "Campaign",
    mockVitaFlow: "Mock VitaFlow",
    ready: "Ready",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
    voiceAssistance: "Voice assistance",
    listeningSecurely: "Listening securely on this kiosk",
    realtimeConnected: "Realtime connected",
    safetySupportCopy: "Information support only · A pharmacist remains available",
    freshSession: "Fresh session",
    preparingAnswer: "Preparing answer...",
    tapOnceToBegin: "Tap once to begin",
    retryOrStart: "Please try again or press Start.",
    escalationRequestedCopy: "Pharmacist assistance requested.",
    idleSubtitle: "Tap to Speak to ask about products, stock, promotions, or shelf location.",
    listeningSubtitle: "Listening...",
    thinkingSubtitle: "Preparing answer…",
    errorSubtitle: "Sorry, I could not hear that clearly. Please try again.",
    escalationSubtitle: "For your safety, I will request pharmacist assistance.",
    typingScreen: "VitaKiosk typing screen",
    focusedTyping: "Focused typing",
    keyboardGuidance: "EN QWERTY is a backup for English and Bahasa Melayu. Use the device keyboard for Chinese pinyin or external keyboard input.",
    typingPlaceholder: "Type your question here. Use the EN on-screen keyboard, device keyboard, or external keyboard.",
    space: "Space",
    backspace: "Backspace",
    done: "Done",
    openTypingScreen: "Open typing screen",
    productNotFound: "Product not found",
    readyForProductSearch: "Ready for product search",
    noProductGuess: "No product details were guessed.",
    askForProduct: "Tap to Speak and ask for a product.",
    currentProductPrice: "Current VitaFlow product price",
    vitaFlowErp: "VitaFlow ERP",
    systemProvenance: "System provenance",
    data: "Data",
    mode: "Mode",
    fictionalDemoData: "Fictional demo data",
    clinicalSafety: "Clinical safety",
    pharmacistAvailable: "Our pharmacist is available to assist.",
    safetyEscalationActive: "Safety escalation active.",
    requestPharmacistReview: "Request pharmacist review",
    safeHandoffOnly: "In-store safety handoff only.",
  },
  zh: {
    aiPharmacyAssistant: "AI 药房助手",
    tapToSpeak: "点击说话",
    tapToStop: "点击停止",
    tryAgain: "再试一次",
    start: "开始",
    startNewCustomer: "开始新顾客",
    connected: "已连接",
    localStateMode: "本地状态模式",
    mockMode: "模拟模式",
    noCustomerData: "无顾客资料",
    product: "产品",
    productVerified: "产品已确认",
    productSummary: "产品简介",
    enlargedProductDetails: "放大产品详情",
    enlargedProductSummary: "放大产品简介",
    ingredient: "成分",
    howToUse: "使用方法",
    bestFor: "适合",
    size: "规格",
    description: "简介",
    stock: "库存",
    branch: "分店",
    shelf: "货架",
    source: "来源",
    shelfNavigation: "货架导航",
    shelfNavigationMap: "货架导航地图",
    shortestRoute: "最短路线",
    unavailable: "暂无资料",
    youAreHere: "你在这里",
    target: "目标位置",
    aisle: "通道",
    level: "层",
    route: "路线",
    indoorPharmacyMap: "室内药房地图",
    pharmacistAssistance: "药剂师协助",
    requestAssistance: "请求协助",
    pharmacistRequested: "已请求药剂师",
    typeYourQuestion: "输入你的问题",
    askPlaceholder: "可询问产品、库存、促销或货架位置",
    send: "发送",
    clear: "清除",
    closeDone: "关闭 / 完成",
    promotionLeaflet: "促销海报",
    enlargeLeaflet: "放大海报",
    promotion: "促销",
    campaign: "健康活动",
    mockVitaFlow: "Mock VitaFlow",
    ready: "准备中",
    listening: "聆听中",
    thinking: "思考中",
    speaking: "说明中",
    voiceAssistance: "语音协助",
    listeningSecurely: "正在本机聆听",
    realtimeConnected: "实时连接",
    safetySupportCopy: "仅提供资讯支持 · 药剂师随时可协助",
    freshSession: "新顾客会话",
    preparingAnswer: "正在准备回答...",
    tapOnceToBegin: "点击开始",
    retryOrStart: "请再试一次，或按开始。",
    escalationRequestedCopy: "已请求药剂师协助。",
    idleSubtitle: "点击说话，可询问产品、库存、促销或货架位置。",
    listeningSubtitle: "聆听中...",
    thinkingSubtitle: "正在准备回答...",
    errorSubtitle: "抱歉，我没有听清楚。请再试一次。",
    escalationSubtitle: "为了安全，我会请求药剂师协助。",
    typingScreen: "VitaKiosk 输入界面",
    focusedTyping: "专注输入",
    keyboardGuidance: "EN QWERTY 可作为英文和马来文备用键盘。中文拼音或外接键盘请使用设备键盘。",
    typingPlaceholder: "在这里输入问题。可使用屏幕英文键盘、设备键盘或外接键盘。",
    space: "空格",
    backspace: "退格",
    done: "完成",
    openTypingScreen: "打开输入界面",
    productNotFound: "未找到产品",
    readyForProductSearch: "准备搜索产品",
    noProductGuess: "未猜测任何产品资料。",
    askForProduct: "点击说话并询问产品。",
    currentProductPrice: "当前 VitaFlow 产品价格",
    vitaFlowErp: "VitaFlow ERP",
    systemProvenance: "系统来源",
    data: "资料",
    mode: "模式",
    fictionalDemoData: "虚构演示资料",
    clinicalSafety: "用药安全",
    pharmacistAvailable: "我们的药剂师可提供协助。",
    safetyEscalationActive: "安全转交已启动。",
    requestPharmacistReview: "请求药剂师审核",
    safeHandoffOnly: "仅限店内安全转交。",
  },
  ms: {
    aiPharmacyAssistant: "Pembantu Farmasi AI",
    tapToSpeak: "Tekan untuk bercakap",
    tapToStop: "Tekan untuk berhenti",
    tryAgain: "Cuba lagi",
    start: "Mula",
    startNewCustomer: "Mula pelanggan baharu",
    connected: "Bersambung",
    localStateMode: "Mod keadaan tempatan",
    mockMode: "Mod mock",
    noCustomerData: "Tiada data pelanggan",
    product: "Produk",
    productVerified: "Produk disahkan",
    productSummary: "Ringkasan produk",
    enlargedProductDetails: "Butiran produk dibesarkan",
    enlargedProductSummary: "Ringkasan produk dibesarkan",
    ingredient: "Bahan",
    howToUse: "Cara guna",
    bestFor: "Sesuai untuk",
    size: "Saiz",
    description: "Penerangan",
    stock: "Stok",
    branch: "Cawangan",
    shelf: "Rak",
    source: "Sumber",
    shelfNavigation: "Navigasi rak",
    shelfNavigationMap: "Peta navigasi rak",
    shortestRoute: "Laluan terpantas",
    unavailable: "Tidak tersedia",
    youAreHere: "Anda di sini",
    target: "Lokasi sasaran",
    aisle: "Lorong",
    level: "Tahap",
    route: "Laluan",
    indoorPharmacyMap: "Peta dalaman farmasi",
    pharmacistAssistance: "Bantuan ahli farmasi",
    requestAssistance: "Minta bantuan",
    pharmacistRequested: "Ahli farmasi diminta",
    typeYourQuestion: "Taip soalan anda",
    askPlaceholder: "Tanya tentang produk, stok, promosi, atau lokasi rak",
    send: "Hantar",
    clear: "Padam",
    closeDone: "Tutup / Selesai",
    promotionLeaflet: "Risalah Promosi",
    enlargeLeaflet: "Besarkan Risalah",
    promotion: "Promosi",
    campaign: "Kempen",
    mockVitaFlow: "Mock VitaFlow",
    ready: "Sedia",
    listening: "Mendengar",
    thinking: "Berfikir",
    speaking: "Sedang bercakap",
    voiceAssistance: "Bantuan suara",
    listeningSecurely: "Mendengar dengan selamat di kiosk ini",
    realtimeConnected: "Sambungan masa nyata",
    safetySupportCopy: "Sokongan maklumat sahaja · Ahli farmasi masih tersedia",
    freshSession: "Sesi baharu",
    preparingAnswer: "Menyediakan jawapan...",
    tapOnceToBegin: "Tekan sekali untuk mula",
    retryOrStart: "Sila cuba lagi atau tekan Mula.",
    escalationRequestedCopy: "Bantuan ahli farmasi telah diminta.",
    idleSubtitle: "Tekan untuk bercakap tentang produk, stok, promosi, atau lokasi rak.",
    listeningSubtitle: "Mendengar...",
    thinkingSubtitle: "Menyediakan jawapan...",
    errorSubtitle: "Maaf, saya tidak dapat mendengar dengan jelas. Sila cuba lagi.",
    escalationSubtitle: "Demi keselamatan anda, saya akan minta bantuan ahli farmasi.",
    typingScreen: "Skrin menaip VitaKiosk",
    focusedTyping: "Menaip fokus",
    keyboardGuidance: "EN QWERTY ialah sandaran untuk English dan Bahasa Melayu. Gunakan papan kekunci peranti untuk pinyin Cina atau input papan kekunci luaran.",
    typingPlaceholder: "Taip soalan anda di sini. Gunakan papan kekunci EN pada skrin, papan kekunci peranti, atau papan kekunci luaran.",
    space: "Space",
    backspace: "Backspace",
    done: "Selesai",
    openTypingScreen: "Buka skrin menaip",
    productNotFound: "Produk tidak dijumpai",
    readyForProductSearch: "Sedia untuk carian produk",
    noProductGuess: "Tiada butiran produk direka.",
    askForProduct: "Tekan untuk bercakap dan tanya tentang produk.",
    currentProductPrice: "Harga produk VitaFlow semasa",
    vitaFlowErp: "VitaFlow ERP",
    systemProvenance: "Asal sistem",
    data: "Data",
    mode: "Mod",
    fictionalDemoData: "Data demo rekaan",
    clinicalSafety: "Keselamatan klinikal",
    pharmacistAvailable: "Ahli farmasi kami tersedia untuk membantu.",
    safetyEscalationActive: "Eskalasi keselamatan aktif.",
    requestPharmacistReview: "Minta semakan ahli farmasi",
    safeHandoffOnly: "Serahan keselamatan dalam kedai sahaja.",
  },
};

export function normalizeLanguage(value: unknown): KioskLanguage | null {
  return value === "en" || value === "zh" || value === "ms" ? value : null;
}

export function getTranslations(language: KioskLanguage): KioskTranslations {
  return translations[language];
}
