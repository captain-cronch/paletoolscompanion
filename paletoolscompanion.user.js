// ==UserScript==
// @name         Paletools Companion
// @namespace    https://paletools-companion.local
// @version      1.14.2
// @description  Pack Opener companion rules + pack opener templates + SBC template transfer sources + one-click SBC templates + club value-scan
// @author       Companion
// @match        https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app/
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app/
// @run-at       document-start
// @grant        unsafeWindow
// @order        100
// ==/UserScript==

(function () {
  'use strict';

  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  const STORAGE_NATIONS = 'paletools-companion:importantManagerNationIds';
  const STORAGE_LEAGUES = 'paletools-companion:importantDuplicateLeagueIds';
  const STORAGE_PLAYER_NATIONS = 'paletools-companion:importantPlayerNationIds';
  const STORAGE_MANAGER_LEAGUES = 'paletools-companion:importantManagerLeagueIds';
  const STORAGE_PLAYER_SBC_LEAGUES = 'paletools-companion:sbcPlayerLeagueIds';
  const STORAGE_PLAYER_SBC_NATIONS = 'paletools-companion:sbcPlayerNationIds';
  const STORAGE_ACTIONS = 'paletools-companion:managerPurchaseActions';
  const STORAGE_PACK_RULES = 'paletools-companion:packRules';
  const STORAGE_UNDERCUTS = 'paletools-companion:minUndercuts';
  const STORAGE_CLUB_FLOOR_QS = 'paletools-companion:clubFloorListingsToQs';
  /** { challengeId, setId } for the free-space SBC, or null */
  const STORAGE_TL_FULL_SBC = 'paletools-companion:tlFullSbc';
  const STORAGE_TEMPLATE_IGNORE = 'paletools-companion:templateIgnoreImportance';
  /** { [challengeId]: { steps: OneClickStep[] } } */
  const STORAGE_ONE_CLICK_TEMPLATES = 'paletools-companion:oneClickSbcTemplates';
  /** Named Pack Opener setups: pack, Paletools fields, and companion rules */
  const STORAGE_PACK_OPENER_TEMPLATES = 'paletools-companion:packOpenerTemplates';
  const DEFAULT_MIN_UNDERCUTS = 3;
  const MAX_MIN_UNDERCUTS = 20;
  const DEFAULT_CLUB_FLOOR_LISTINGS_TO_QS = 5;
  const MAX_CLUB_FLOOR_LISTINGS_TO_QS = 50;
  /** @deprecated legacy Pack Opener custom actions — migrated into packRules */
  const SPLIT_ACTION = 'importantManagerNationsSplit';
  const PLAYER_PRICE_ACTION = 'importantLeagueDupsPriceList';
  const STADIUM_SPLIT_ACTION = 'stadiumsToClubOtherItemsQs';
  const FACADE_ACTION = 'quickSell';
  const CUSTOM_ACTIONS = new Set([
    SPLIT_ACTION,
    PLAYER_PRICE_ACTION,
    STADIUM_SPLIT_ACTION,
  ]);
  const LIST_DURATION_SECONDS = 3600;

  const PACK_ACTION = {
    CLUB: 'club',
    QUICK_SELL: 'quickSell',
    TRANSFER: 'transfer',
    LIST: 'list',
  };
  const PACK_ACTION_OPTIONS = [
    { value: PACK_ACTION.CLUB, label: 'Club' },
    { value: PACK_ACTION.QUICK_SELL, label: 'Quick sell' },
    { value: PACK_ACTION.TRANSFER, label: 'Transfer list (unlisted)' },
    { value: PACK_ACTION.LIST, label: 'Dig+list (market)' },
  ];
  /** Duplicates cannot go to Club — omit that option from Dup dropdowns. */
  const PACK_ACTION_OPTIONS_DUPLICATE = PACK_ACTION_OPTIONS.filter(
    (opt) => opt.value !== PACK_ACTION.CLUB
  );
  /**
   * Pack-item types, in the same groups as the web app's club search filters.
   * subtypes are ItemSubType names. legacy is the previous six-type id.
   */
  const VANITY_GROUPS = [
    {
      id: 'club',
      label: 'Club',
      items: [
        { id: 'kit', label: 'Kits', legacy: 'kit', methods: ['isKit'] },
        { id: 'ball', label: 'Ball', legacy: 'ball', methods: ['isBall'] },
        {
          id: 'celebration',
          label: 'Player Celebration',
          subtypes: ['VANITY_PLAYER_CELEBRATION'],
        },
        {
          id: 'nickname',
          label: 'Club Nickname',
          subtypes: ['VANITY_AUDIO_CLUB_NICKNAME'],
        },
        {
          id: 'anthem',
          label: 'Club Anthem',
          subtypes: ['VANITY_AUDIO_ANTHEM_MUSIC'],
        },
        {
          id: 'chant',
          label: 'Crowd Chants',
          subtypes: ['VANITY_AUDIO_CROWD_CHANT'],
        },
        {
          id: 'goalSong',
          label: 'Goal Song',
          subtypes: ['VANITY_AUDIO_GOAL_SCORE'],
        },
        { id: 'badge', label: 'Badge', legacy: 'badge', methods: ['isBadge'] },
      ],
    },
    {
      id: 'structure',
      label: 'Structure',
      items: [
        { id: 'stadium', label: 'Stadium', legacy: 'stadium', methods: ['isStadium'] },
        {
          id: 'stadiumTheme',
          label: 'Stadium Theme',
          subtypes: ['VANITY_STADIUM_THEME'],
        },
        {
          id: 'stadiumPaint',
          label: 'Stadium Paint Colour',
          subtypes: ['VANITY_STADIUM_BASE_STRUCTURE_COLOR'],
        },
        {
          id: 'seatColour',
          label: 'Seat Colour',
          subtypes: ['VANITY_STADIUM_BASE_SEAT_COLOR'],
        },
        { id: 'vip', label: 'VIP Area', subtypes: ['VANITY_VIP_AREA'] },
        {
          id: 'goalColours',
          label: 'Goal Colours',
          subtypes: ['VANITY_STADIUM_BASE_PITCH_GOAL_PACKAGE'],
        },
        {
          id: 'flame',
          label: 'Flame Cannons',
          subtypes: ['VANITY_PYROTECHNICS_FLAME_CANNON'],
        },
        {
          id: 'confetti',
          label: 'Confetti Cannons',
          subtypes: ['VANITY_PYROTECHNICS_CONFETTI_CANNON'],
        },
        {
          id: 'sparklers',
          label: 'Sparklers',
          subtypes: ['VANITY_PYROTECHNICS_SPARKLER_CANNON'],
        },
        {
          id: 'fireworks',
          label: 'Fireworks',
          subtypes: ['VANITY_PYROTECHNICS_FIREWORKS_CANNON'],
        },
        {
          id: 'pitchLine',
          label: 'Pitch Line Paint',
          subtypes: ['VANITY_STADIUM_BASE_PITCH_LINE_COLOR'],
        },
        {
          id: 'pitchPattern',
          label: 'Pitch Patterns',
          subtypes: ['VANITY_STADIUM_BASE_PITCH_MOW_PATTERN'],
        },
      ],
    },
    {
      id: 'cosmetics',
      label: 'Cosmetics',
      items: [
        { id: 'tifo', label: 'Tifos', legacy: 'tifo', subtypes: ['VANITY_TIFO_BASE'] },
        {
          id: 'tifoAnimated',
          label: 'Animated Tifos',
          subtypes: ['VANITY_TIFO_MOVING'],
        },
        {
          id: 'tifoBackground',
          label: 'Background Tifo',
          subtypes: ['VANITY_TIFO_BIG'],
        },
        {
          id: 'pitchTrophy',
          label: 'Pitch Trophies',
          subtypes: ['VANITY_STADIUM_BASE_PITCH_PROP'],
        },
        {
          id: 'poleBanner',
          label: 'Two Stick Banners',
          subtypes: ['VANITY_POLE_BANNER'],
        },
        {
          id: 'tintedBanner',
          label: 'Tinted Banners',
          subtypes: ['VANITY_TINTED_BANNER'],
        },
        {
          id: 'crowdCards',
          label: 'Crowd Cards',
          subtypes: ['VANITY_CROWD_CARDS'],
        },
      ],
    },
    {
      id: 'consumables',
      label: 'Consumables',
      items: [
        { id: 'chemistry', label: 'Chemistry Styles' },
        { id: 'managerLeague', label: 'Manager Leagues' },
        { id: 'healing', label: 'Healing' },
      ],
    },
  ];
  const VANITY_LEGACY_KIND = {
    stadium: 'stadium',
    badge: 'badge',
    kit: 'kit',
    tifo: 'tifo',
    ball: 'ball',
  };
  /** Randomized gaps between EA API actions (ms) to reduce rate-limit / soft-ban risk */
  const PACE = {
    marketSearch: { min: 1800, max: 3200 },
    list: { min: 2500, max: 4500 },
    move: { min: 1200, max: 2200 },
    betweenPlayers: { min: 3500, max: 6000 },
    clubScan: { min: 4000, max: 7500 },
    discard: { min: 900, max: 1600 },
    rateLimitBackoff: { min: 10000, max: 18000 },
  };

  const SELECTORS = {
    players: '#pack-opener-players-purchase-action',
    managers: '#pack-opener-managers-purchase-action',
    duplicatedManagers: '#pack-opener-duplicated-managers-purchase-action',
    duplicatedPlayers: '#pack-opener-duplicated-players-purchase-action',
    items: '#pack-opener-items-purchase-action',
    duplicatedItems: '#pack-opener-duplicated-items-purchase-action',
    transferListFull: '#pack-opener-transfer-list-full-purchase-action',
    dialog: '.pack-opener-dialog',
  };

  /** Companion action on Paletools' transfer-list-full dropdown. */
  const TL_FULL_FREE_SPACE = 'freeSpace';
  /** Free space and continue stops the pack opener when fewer slots than this open. */
  const TL_FULL_MIN_FREED = 5;
  const TRANSFER_LIST_CAPACITY = 100;

  const NATIVE_PACK_CATEGORY_SELECTORS = [
    SELECTORS.players,
    SELECTORS.managers,
    SELECTORS.duplicatedManagers,
    SELECTORS.duplicatedPlayers,
    SELECTORS.items,
    SELECTORS.duplicatedItems,
  ];

  const state = {
    originalDiscard: null,
    processing: false,
    debug: true,
    /** Managers / unlisted dups moved to TL — used to fix Pack Opener recap */
    pendingTransferItems: [],
    pendingTransferCount: 0,
    /** Successfully market-listed dups: { item, buyNow, bid } */
    pendingListedEntries: [],
    domRecapPatched: false,
    listedRecapPatched: false,
    lastPacedActionAt: 0,
    /** Pack Opener early-stop (finish current pack, then halt) */
    packOpenerRunning: false,
    earlyStopRequested: false,
    earlyStopArmed: false,
    earlyStopTriggered: false,
    /** Soft-ban seen during Pack Opener Dig+list — skip further digs this run */
    packOpenerSoftBanned: false,
    /** Transfer-list-full dropdown value captured when Pack Opener starts */
    tlFullAction: null,
    /** In-flight free-space cleanup so parallel checks share one pass */
    tlFullCleanupPromise: null,
    /** Live left-side pack summary while Pack Opener runs */
    packSummaryTimer: null,
    packSummaryLastHtml: '',
    /** Live Pack Opener state object (only reachable via packsOpened capture mid-run) */
    cachedPackOpenerState: null,
    packStateCaptureInstalled: false,
    prevPacksOpenedDescriptor: null,
    /** Fallback tallies when state object isn't captured yet */
    liveSummary: null,
    seenPullKeys: null,
    /** Players successfully sent to the club by pack rules this run */
    packClubPlayers: null,
    coinRewardHooksInstalled: false,
    /** Paletools player-action digger (same as hotkey V / _onFindLowestPrice) */
    paletoolsFindLowestFn: null,
    /** Serialize find-lowest calls (Paletools dig has a re-entrancy lock) */
    paletoolsDigChain: Promise.resolve(),
    /** Club/stadium vanity value-scan */
    clubScanRunning: false,
    /** Set while filterAndSortPlayers has already removed unique copies. */
    sbcPoolFiltered: false,
    /** Definition ids of unlisted transfer-list cards. Their club copies are duplicates. */
    sbcSpareDefIds: null,
    clubScanStopRequested: false,
    clubScanStats: null,
    /** Recent UTAS XHR statuses (soft-ban codes often missing from EA observe payloads) */
    recentUtasStatuses: [],
    xhrStatusHookInstalled: false,
    /** Prevent MutationObserver feedback while we write Pack Opener DOM */
    companionDomWrite: false,
    enhancingDialog: false,
    domMutateTimer: null,
    /** Logged unknown vanity shapes once per session */
    loggedUnknownVanityKeys: null,
    /** Rolling plain-text log for copy/paste debugging */
    debugLog: [],
    /** Pack card whose Open Pack button opened the current dialog */
    packOpenerSourcePack: null,
    /** Store hub template list is open */
    packTemplatesListOpen: false,
    packTemplateStarting: false,
  };

  const DEBUG_LOG_LIMIT = 400;

  function summarizeDebugValue(value, depth = 0, seen = new WeakSet()) {
    if (value == null) return value;
    const t = typeof value;
    if (t === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
    if (t === 'number' || t === 'boolean') return value;
    if (t === 'function') return '[function]';
    if (value instanceof Error) {
      return { name: value.name, message: value.message };
    }
    if (depth > 3) return '[…]';
    if (t === 'object') {
      if (typeof Node !== 'undefined' && value instanceof Node) {
        return `[node ${value.nodeName || ''}]`;
      }
      if (seen.has(value)) return '[circular]';
      seen.add(value);
    }
    if (Array.isArray(value)) {
      const head = value.slice(0, 8).map((entry) => summarizeDebugValue(entry, depth + 1, seen));
      if (value.length > 8) head.push(`…${value.length - 8} more`);
      return head;
    }
    if (t !== 'object') return String(value);
    try {
      if (typeof value.getDefinitionId === 'function' || value.definitionId != null || typeof value.isPlayer === 'function') {
        let auction = null;
        try {
          auction = typeof value.getAuctionData === 'function' ? value.getAuctionData() : null;
        } catch {
          auction = null;
        }
        return {
          item: true,
          definitionId: value.definitionId ?? null,
          duplicateId: value.duplicateId ?? null,
          rating: value.rating ?? null,
          tradeState: auction?.tradeState ?? auction?._tradeState ?? null,
          auctionValid:
            auction && typeof auction.isValid === 'function' ? auction.isValid() : null,
        };
      }
    } catch {
      /* ignore */
    }
    const out = {};
    const keys = Object.keys(value).slice(0, 20);
    for (const key of keys) {
      try {
        out[key] = summarizeDebugValue(value[key], depth + 1, seen);
      } catch {
        out[key] = '[unreadable]';
      }
    }
    if (Object.keys(value).length > keys.length) out._truncatedKeys = true;
    return out;
  }

  function recordDebug(level, args) {
    let text = '';
    try {
      text = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          return JSON.stringify(summarizeDebugValue(arg));
        })
        .join(' ');
    } catch {
      text = args.map((arg) => String(arg)).join(' ');
    }
    state.debugLog.push({
      at: new Date().toISOString(),
      level,
      text,
    });
    if (state.debugLog.length > DEBUG_LOG_LIMIT) {
      state.debugLog.splice(0, state.debugLog.length - DEBUG_LOG_LIMIT);
    }
  }

  function formatDebugLog() {
    const header = [
      `Paletools Companion ${
        typeof GM_info !== 'undefined' ? GM_info?.script?.version || '1.12.35' : '1.12.35'
      }`,
      `page: ${win.location?.href || ''}`,
      `packOpenerRunning: ${!!state.packOpenerRunning}`,
      `tlFullAction: ${state.tlFullAction || ''}`,
      `tlFullSbcChallengeId: ${getTlFullSbcChoice()?.challengeId || ''}`,
      `tlFullSbcTemplateKey: ${getTlFullSbcChoice()?.templateKey || ''}`,
      `tlFullCleanupGaveUp: ${!!state.tlFullCleanupGaveUp}`,
      `entries: ${state.debugLog.length}`,
    ];
    const lines = state.debugLog.map((entry) => `${entry.at} ${entry.level} ${entry.text}`);
    return header.concat(lines).join('\n');
  }

  async function copyDebugLog() {
    const text = formatDebugLog();
    let copied = false;
    try {
      if (win.navigator?.clipboard?.writeText) {
        await win.navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) {
      try {
        const area = win.document.createElement('textarea');
        area.value = text;
        area.style.cssText = 'position:fixed;left:-9999px;top:0';
        (win.document.body || win.document.documentElement).appendChild(area);
        area.focus();
        area.select();
        copied = win.document.execCommand('copy');
        area.remove();
      } catch {
        copied = false;
      }
    }
    log(copied ? 'Debug log copied to clipboard' : 'Debug log copy failed', {
      entries: state.debugLog.length,
    });
    try {
      win.services?.Notification?.queue?.([
        copied
          ? `Companion debug log copied (${state.debugLog.length} lines)`
          : 'Companion debug log could not be copied',
        win.UINotificationType?.NEUTRAL ?? 0,
      ]);
    } catch {
      /* ignore */
    }
    return copied;
  }

  try {
    win.paletoolsCompanionDebug = {
      copy: copyDebugLog,
      text: formatDebugLog,
    };
  } catch {
    /* ignore */
  }

  function log(...args) {
    recordDebug('info', args);
    if (!state.debug) return;
    console.info('[Paletools Companion]', ...args);
  }

  function warn(...args) {
    recordDebug('warn', args);
    console.warn('[Paletools Companion]', ...args);
  }

  function resetPendingTransfers() {
    state.pendingTransferItems = [];
    state.pendingTransferCount = 0;
    state.pendingListedEntries = [];
    state.domRecapPatched = false;
    state.listedRecapPatched = false;
  }

  function rememberTransferred(items) {
    if (!items?.length) return;
    state.pendingTransferItems.push(...items);
    state.pendingTransferCount += items.length;
  }

  function rememberListed(item, pricing) {
    if (!item) return;
    state.pendingListedEntries.push({
      item,
      buyNow: pricing?.buyNow ?? null,
      bid: pricing?.bid ?? null,
    });
    if (state.packOpenerRunning) {
      rememberTopPull(item);
      updateLivePackSummaryPanel();
    }
  }

  function getItemDisplayName(item) {
    if (!item) return 'Player';
    try {
      const staticData =
        typeof item.getStaticData === 'function'
          ? item.getStaticData()
          : item._staticData;
      const name =
        staticData?.name ||
        staticData?.commonName ||
        [staticData?.firstName, staticData?.lastName].filter(Boolean).join(' ');
      if (name) return name;
    } catch {
      /* ignore */
    }
    return (
      item._meta?.name ||
      item.name ||
      (item.definitionId != null ? `Player #${item.definitionId}` : 'Player')
    );
  }

  function getItemRating(item) {
    const n = Number(item?.rating ?? item?._rating);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function formatCoins(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('en-US');
  }

  function formatSignedCoins(value) {
    const n = Math.round(Number(value) || 0);
    const abs = formatCoins(Math.abs(n));
    if (n > 0) return `+${abs}`;
    if (n < 0) return `-${abs}`;
    return abs;
  }

  /** Paletools reuses this array after await — keep only items that were actually sold. */
  function replaceArrayContents(arr, nextItems) {
    if (!Array.isArray(arr)) return;
    arr.length = 0;
    for (const item of nextItems) arr.push(item);
  }

  function readJson(key, fallback) {
    try {
      const raw = win.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    win.localStorage.setItem(key, JSON.stringify(value));
  }

  function readIdSet(key) {
    const ids = readJson(key, []);
    return new Set(
      (ids || []).map((id) => Number(id)).filter((n) => !Number.isNaN(n))
    );
  }

  function writeIdSet(key, ids) {
    writeJson(key, [
      ...new Set(
        (ids || []).map((id) => Number(id)).filter((n) => !Number.isNaN(n))
      ),
    ]);
  }

  function getImportantNationIds() {
    return readIdSet(STORAGE_NATIONS);
  }

  function setImportantNationIds(ids) {
    writeIdSet(STORAGE_NATIONS, ids);
  }

  function getImportantLeagueIds() {
    return readIdSet(STORAGE_LEAGUES);
  }

  function setImportantLeagueIds(ids) {
    writeIdSet(STORAGE_LEAGUES, ids);
  }

  function getPlayerNationIds() {
    return readIdSet(STORAGE_PLAYER_NATIONS);
  }

  function setPlayerNationIds(ids) {
    writeIdSet(STORAGE_PLAYER_NATIONS, ids);
  }

  function getManagerLeagueIds() {
    return readIdSet(STORAGE_MANAGER_LEAGUES);
  }

  function setManagerLeagueIds(ids) {
    writeIdSet(STORAGE_MANAGER_LEAGUES, ids);
  }

  function getPlayerSbcLeagueIds() {
    return readIdSet(STORAGE_PLAYER_SBC_LEAGUES);
  }

  function setPlayerSbcLeagueIds(ids) {
    writeIdSet(STORAGE_PLAYER_SBC_LEAGUES, ids);
  }

  function getPlayerSbcNationIds() {
    return readIdSet(STORAGE_PLAYER_SBC_NATIONS);
  }

  function setPlayerSbcNationIds(ids) {
    writeIdSet(STORAGE_PLAYER_SBC_NATIONS, ids);
  }

  function getSavedActions() {
    return readJson(STORAGE_ACTIONS, {
      managers: null,
      duplicatedManagers: null,
      duplicatedPlayers: null,
      items: null,
      duplicatedItems: null,
    });
  }

  function setSavedActions(partial) {
    writeJson(STORAGE_ACTIONS, { ...getSavedActions(), ...partial });
  }

  function isPackAction(value) {
    return (
      value === PACK_ACTION.CLUB ||
      value === PACK_ACTION.QUICK_SELL ||
      value === PACK_ACTION.TRANSFER ||
      value === PACK_ACTION.LIST
    );
  }

  function isDuplicatePackAction(value) {
    return (
      value === PACK_ACTION.QUICK_SELL ||
      value === PACK_ACTION.TRANSFER ||
      value === PACK_ACTION.LIST
    );
  }

  /** Club is invalid for duplicates — coerce to transfer list unlisted. */
  function coerceDuplicatePackAction(value, fallback = PACK_ACTION.TRANSFER) {
    if (value === PACK_ACTION.CLUB) return PACK_ACTION.TRANSFER;
    if (isDuplicatePackAction(value)) return value;
    return isDuplicatePackAction(fallback) ? fallback : PACK_ACTION.TRANSFER;
  }

  function vanityCatalogItems() {
    const items = [];
    for (const group of VANITY_GROUPS) {
      for (const item of group.items) items.push({ ...item, group: group.id });
    }
    return items;
  }

  function vanityItemById(id) {
    return vanityCatalogItems().find((item) => item.id === id) || null;
  }

  function canonicalVanityKind(kind) {
    const text = String(kind || '');
    if (vanityItemById(text)) return text;
    return VANITY_LEGACY_KIND[text] || null;
  }

  function defaultVanityItemRule(id) {
    if (id === 'stadium') {
      return { new: PACK_ACTION.CLUB, duplicate: PACK_ACTION.TRANSFER };
    }
    return { new: PACK_ACTION.QUICK_SELL, duplicate: PACK_ACTION.QUICK_SELL };
  }

  function defaultPackRules() {
    const vanity = {};
    for (const item of vanityCatalogItems()) {
      vanity[item.id] = defaultVanityItemRule(item.id);
    }
    const vanityGroups = {};
    for (const group of VANITY_GROUPS) {
      vanityGroups[group.id] = {
        new: PACK_ACTION.QUICK_SELL,
        duplicate: PACK_ACTION.QUICK_SELL,
      };
    }
    return {
      players: {
        newImportant: PACK_ACTION.CLUB,
        newOther: PACK_ACTION.CLUB,
        dupImportant: PACK_ACTION.LIST,
        dupOther: PACK_ACTION.TRANSFER,
      },
      managers: {
        newImportant: PACK_ACTION.LIST,
        newOther: PACK_ACTION.QUICK_SELL,
        dupImportant: PACK_ACTION.LIST,
        dupOther: PACK_ACTION.QUICK_SELL,
      },
      vanity,
      vanityGroups,
      vanityIndividual: [],
    };
  }

  function normalizeVanityRule(raw, fallback) {
    const base = fallback || {
      new: PACK_ACTION.QUICK_SELL,
      duplicate: PACK_ACTION.QUICK_SELL,
    };
    if (!raw || typeof raw !== 'object') return { ...base };
    return {
      new: isPackAction(raw.new) ? raw.new : base.new,
      duplicate: coerceDuplicatePackAction(raw.duplicate, base.duplicate),
    };
  }

  function normalizePackRules(raw) {
    const defaults = defaultPackRules();
    const src = raw && typeof raw === 'object' ? raw : {};
    const playersIn = src.players && typeof src.players === 'object' ? src.players : {};
    const managersIn =
      src.managers && typeof src.managers === 'object' ? src.managers : {};
    const vanityIn = src.vanity && typeof src.vanity === 'object' ? src.vanity : {};
    const players = { ...defaults.players };
    const managers = { ...defaults.managers };
    for (const key of Object.keys(players)) {
      if (!isPackAction(playersIn[key])) continue;
      players[key] = key.startsWith('dup')
        ? coerceDuplicatePackAction(playersIn[key], defaults.players[key])
        : playersIn[key];
    }
    for (const key of Object.keys(managers)) {
      if (!isPackAction(managersIn[key])) continue;
      managers[key] = key.startsWith('dup')
        ? coerceDuplicatePackAction(managersIn[key], defaults.managers[key])
        : managersIn[key];
    }
    const vanity = {};
    for (const item of vanityCatalogItems()) {
      const legacy = item.legacy && vanityIn[item.legacy];
      vanity[item.id] = normalizeVanityRule(
        vanityIn[item.id] || legacy,
        defaults.vanity[item.id]
      );
    }
    const sharedFallback = normalizeVanityRule(
      src.vanityShared || vanityIn.other,
      { new: PACK_ACTION.QUICK_SELL, duplicate: PACK_ACTION.QUICK_SELL }
    );
    const groupsIn =
      src.vanityGroups && typeof src.vanityGroups === 'object' ? src.vanityGroups : {};
    const vanityGroups = {};
    for (const group of VANITY_GROUPS) {
      vanityGroups[group.id] = normalizeVanityRule(groupsIn[group.id], sharedFallback);
    }
    let vanityIndividual;
    if (Array.isArray(src.vanityIndividual)) {
      vanityIndividual = [
        ...new Set(
          src.vanityIndividual.map(canonicalVanityKind).filter((kind) => kind)
        ),
      ];
    } else {
      vanityIndividual = vanityCatalogItems()
        .filter((item) => {
          const row = vanity[item.id];
          const group = vanityGroups[item.group];
          return row.new !== group.new || row.duplicate !== group.duplicate;
        })
        .map((item) => item.id);
    }
    const normalized = { players, managers, vanity, vanityGroups, vanityIndividual };
    if (!src.vanityGroups || !Array.isArray(src.vanityIndividual)) {
      writeJson(STORAGE_PACK_RULES, normalized);
    }
    return normalized;
  }

  function migratePackRulesFromLegacy() {
    const existing = readJson(STORAGE_PACK_RULES, null);
    if (existing && existing.players && existing.managers && existing.vanity) {
      return normalizePackRules(existing);
    }

    const rules = defaultPackRules();
    const saved = getSavedActions();

    if (
      saved.managers === SPLIT_ACTION ||
      saved.duplicatedManagers === SPLIT_ACTION
    ) {
      rules.managers.newImportant = PACK_ACTION.LIST;
      rules.managers.newOther = PACK_ACTION.QUICK_SELL;
      rules.managers.dupImportant = PACK_ACTION.LIST;
      rules.managers.dupOther = PACK_ACTION.QUICK_SELL;
    }

    if (saved.duplicatedPlayers === PLAYER_PRICE_ACTION) {
      rules.players.dupImportant = PACK_ACTION.LIST;
      rules.players.dupOther = PACK_ACTION.TRANSFER;
    }

    if (
      saved.items === STADIUM_SPLIT_ACTION ||
      saved.duplicatedItems === STADIUM_SPLIT_ACTION
    ) {
      rules.vanity.stadium = {
        new: PACK_ACTION.CLUB,
        duplicate: PACK_ACTION.TRANSFER,
      };
      rules.vanityIndividual = ['stadium'];
    }

    writeJson(STORAGE_PACK_RULES, rules);
    log('Migrated pack rules from legacy Pack Opener actions', rules);
    return rules;
  }

  function getPackRules() {
    const stored = readJson(STORAGE_PACK_RULES, null);
    if (!stored || !stored.players) {
      return migratePackRulesFromLegacy();
    }
    return normalizePackRules(stored);
  }

  function setPackRules(next) {
    const normalized = normalizePackRules(next);
    writeJson(STORAGE_PACK_RULES, normalized);
    return normalized;
  }

  function patchPackRules(partial) {
    const current = getPackRules();
    const next = {
      players: { ...current.players, ...(partial.players || {}) },
      managers: { ...current.managers, ...(partial.managers || {}) },
      vanity: { ...current.vanity },
      vanityGroups: { ...current.vanityGroups },
      vanityIndividual: current.vanityIndividual.slice(),
    };
    if (partial.vanityGroups && typeof partial.vanityGroups === 'object') {
      for (const group of VANITY_GROUPS) {
        if (!partial.vanityGroups[group.id]) continue;
        next.vanityGroups[group.id] = normalizeVanityRule(
          { ...current.vanityGroups[group.id], ...partial.vanityGroups[group.id] },
          current.vanityGroups[group.id]
        );
      }
    }
    if (Array.isArray(partial.vanityIndividual)) {
      next.vanityIndividual = partial.vanityIndividual;
    }
    if (partial.vanity && typeof partial.vanity === 'object') {
      for (const item of vanityCatalogItems()) {
        if (partial.vanity[item.id]) {
          next.vanity[item.id] = normalizeVanityRule(
            { ...current.vanity[item.id], ...partial.vanity[item.id] },
            current.vanity[item.id]
          );
        }
      }
    }
    return setPackRules(next);
  }

  function resolvePackRuleForClassification(classification, rules = getPackRules()) {
    const { kind, duplicate, important } = classification || {};
    let action;
    if (kind === 'player') {
      if (duplicate) {
        action = important
          ? rules.players.dupImportant
          : rules.players.dupOther;
      } else {
        action = important
          ? rules.players.newImportant
          : rules.players.newOther;
      }
    } else if (kind === 'manager') {
      if (duplicate) {
        action = important
          ? rules.managers.dupImportant
          : rules.managers.dupOther;
      } else {
        action = important
          ? rules.managers.newImportant
          : rules.managers.newOther;
      }
    } else {
      const itemDef = vanityItemById(kind);
      const groupId = itemDef?.group || 'club';
      const groupRule = rules.vanityGroups?.[groupId] || {
        new: PACK_ACTION.QUICK_SELL,
        duplicate: PACK_ACTION.QUICK_SELL,
      };
      const individual = rules.vanityIndividual || [];
      const row =
        itemDef && individual.includes(itemDef.id)
          ? rules.vanity[itemDef.id] || groupRule
          : groupRule;
      action = duplicate ? row.duplicate : row.new;
    }
    if (duplicate) return coerceDuplicatePackAction(action);
    return action;
  }

  /** Cheaper listings required below the chosen BIN (0 = match current lowest). */
  function getMinUndercuts() {
    const raw = readJson(STORAGE_UNDERCUTS, DEFAULT_MIN_UNDERCUTS);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return DEFAULT_MIN_UNDERCUTS;
    return Math.min(MAX_MIN_UNDERCUTS, Math.floor(n));
  }

  function setMinUndercuts(value) {
    const n = Number(value);
    const next = !Number.isFinite(n) || n < 0 ? 0 : Math.min(MAX_MIN_UNDERCUTS, Math.floor(n));
    writeJson(STORAGE_UNDERCUTS, next);
    return next;
  }

  function undercutSettingLabel(n = getMinUndercuts()) {
    if (n <= 0) return 'match lowest';
    if (n === 1) return '1 cheaper listing';
    return `${n} cheaper listings`;
  }

  /** Club vanity scan: QS when listings at min BIN exceed this count. */
  function getClubFloorListingsToQs() {
    const raw = readJson(STORAGE_CLUB_FLOOR_QS, DEFAULT_CLUB_FLOOR_LISTINGS_TO_QS);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_CLUB_FLOOR_LISTINGS_TO_QS;
    return Math.min(MAX_CLUB_FLOOR_LISTINGS_TO_QS, Math.floor(n));
  }

  function setClubFloorListingsToQs(value) {
    const n = Number(value);
    const next =
      !Number.isFinite(n) || n < 1
        ? DEFAULT_CLUB_FLOOR_LISTINGS_TO_QS
        : Math.min(MAX_CLUB_FLOOR_LISTINGS_TO_QS, Math.floor(n));
    writeJson(STORAGE_CLUB_FLOOR_QS, next);
    return next;
  }

  function getSplitLabel() {
    return `List important-nation managers (${undercutSettingLabel()}), quick sell the rest`;
  }

  function getPlayerPriceLabel() {
    return `List important-league dups (${undercutSettingLabel()}); other dups to transfer list unlisted`;
  }

  function getStadiumSplitLabel() {
    return 'Stadiums → club; other items → quick sell';
  }

  function isManager(item) {
    if (!item) return false;
    try {
      if (typeof item.isManager === 'function' && item.isManager()) return true;
    } catch {
      /* ignore */
    }
    if (item._isManager) return true;
    try {
      if (win.ItemType && item.type === win.ItemType.MANAGER) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  function isDuplicate(item) {
    if (!item) return false;
    try {
      if (typeof item.isDuplicate === 'function' && item.isDuplicate()) return true;
    } catch {
      /* ignore */
    }
    return !!item._isDuplicate;
  }

  function getNationId(item) {
    if (!item) return null;
    const candidates = [
      item.nationId,
      item._nationId,
      item.nation?.id,
      item.nation?.nationId,
      typeof item.getNationId === 'function' ? item.getNationId() : null,
      typeof item.getNation === 'function' ? item.getNation() : null,
    ];
    for (const raw of candidates) {
      const n = Number(raw);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
    return null;
  }

  function isImportantPlayer(item) {
    const leagueId = getLeagueId(item);
    const nationId = getNationId(item);
    return (
      (leagueId != null && getImportantLeagueIds().has(leagueId)) ||
      (nationId != null && getPlayerNationIds().has(nationId))
    );
  }

  function isImportantManager(item) {
    const nationId = getNationId(item);
    const leagueId = getLeagueId(item);
    return (
      (nationId != null && getImportantNationIds().has(nationId)) ||
      (leagueId != null && getManagerLeagueIds().has(leagueId))
    );
  }

  function getLiveOrSavedAction(key, selector) {
    const select = win.document.querySelector(selector);
    if (select) {
      const live = getRealSelectValue(select);
      if (live) return live;
    }
    return getSavedActions()[key] || null;
  }

  function isSplitEnabledFor(item) {
    if (!isManager(item)) return false;
    if (isDuplicate(item)) {
      return (
        getLiveOrSavedAction(
          'duplicatedManagers',
          SELECTORS.duplicatedManagers
        ) === SPLIT_ACTION
      );
    }
    return (
      getLiveOrSavedAction('managers', SELECTORS.managers) === SPLIT_ACTION
    );
  }

  function isManagerSplitModeConfigured() {
    return (
      getLiveOrSavedAction('managers', SELECTORS.managers) === SPLIT_ACTION ||
      getLiveOrSavedAction(
        'duplicatedManagers',
        SELECTORS.duplicatedManagers
      ) === SPLIT_ACTION
    );
  }

  function isPlayerPriceModeConfigured() {
    return (
      getLiveOrSavedAction(
        'duplicatedPlayers',
        SELECTORS.duplicatedPlayers
      ) === PLAYER_PRICE_ACTION
    );
  }

  function isStadiumSplitModeConfigured() {
    return (
      getLiveOrSavedAction('items', SELECTORS.items) === STADIUM_SPLIT_ACTION ||
      getLiveOrSavedAction(
        'duplicatedItems',
        SELECTORS.duplicatedItems
      ) === STADIUM_SPLIT_ACTION
    );
  }

  function isSplitModeConfigured() {
    return (
      isManagerSplitModeConfigured() ||
      isPlayerPriceModeConfigured() ||
      isStadiumSplitModeConfigured()
    );
  }

  function getItemTypeValue(item) {
    if (!item) return null;
    try {
      if (typeof item.getType === 'function') {
        const t = item.getType();
        if (t != null && t !== '') return t;
      }
    } catch {
      /* ignore */
    }
    return item.type ?? item._type ?? item.itemType ?? item._itemType ?? null;
  }

  /**
   * True stadium cards (playable stadium / stadium asset), not kits/badges/tifos
   * or other clubInfo vanity that lives under Club → Stadium in the UI.
   */
  function isStadiumItem(item) {
    if (!item || isPlayer(item) || isManager(item)) return false;
    try {
      if (typeof item.isStadium === 'function' && item.isStadium()) return true;
    } catch {
      /* ignore */
    }

    const t = getItemTypeValue(item);
    const ItemType = win.ItemType;
    if (ItemType && t != null) {
      for (const key of ['STADIUM', 'STADIA', 'Stadium', 'Stadia']) {
        try {
          if (ItemType[key] != null && t === ItemType[key]) return true;
        } catch {
          /* ignore */
        }
      }
    }
    if (typeof t === 'string') {
      const s = t.toLowerCase();
      if (s === 'stadium' || s === 'stadia') return true;
    }
    // Classic UT item-type id for Stadium
    if (Number(t) === 10) return true;
    return false;
  }

  function isStadiumSplitEnabledFor(item) {
    if (!isStadiumItem(item)) return false;
    if (isDuplicate(item)) {
      return (
        getLiveOrSavedAction(
          'duplicatedItems',
          SELECTORS.duplicatedItems
        ) === STADIUM_SPLIT_ACTION
      );
    }
    return getLiveOrSavedAction('items', SELECTORS.items) === STADIUM_SPLIT_ACTION;
  }

  function isPlayer(item) {
    if (!item) return false;
    try {
      if (typeof item.isPlayer === 'function' && item.isPlayer()) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  /** Coin reward inside a pack (misc / free coins), not a quick sell. */
  function isFreeCoinItem(item) {
    if (!item || isPlayer(item) || isManager(item)) return false;
    try {
      if (typeof item.isFreeCoins === 'function' && item.isFreeCoins()) return true;
    } catch {
      /* ignore */
    }
    try {
      const misc =
        typeof item.isMiscItem === 'function' && item.isMiscItem();
      const sub = win.ItemSubType;
      if (misc && sub && item.subtype === sub.FREE_COINS) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  function freeCoinAmount(item) {
    if (!isFreeCoinItem(item)) return 0;
    try {
      const staticData =
        typeof item.getStaticData === 'function'
          ? item.getStaticData()
          : item._staticData;
      const fromStatic = Number(staticData?.amount);
      if (Number.isFinite(fromStatic) && fromStatic > 0) return fromStatic;
    } catch {
      /* ignore */
    }
    const fromItem = Number(item.amount);
    if (Number.isFinite(fromItem) && fromItem > 0) return fromItem;
    return 0;
  }

  /** Coins received if a listing sells at BIN. EA keeps 5%. */
  function coinsAfterMarketTax(buyNow) {
    const bin = Number(buyNow) || 0;
    if (bin <= 0) return 0;
    return bin - Math.floor(bin * 0.05);
  }

  function getLeagueId(item) {
    if (!item) return null;
    const candidates = [
      item.leagueId,
      item._leagueId,
      item.league?.id,
      typeof item.getLeagueId === 'function' ? item.getLeagueId() : null,
    ];
    for (const raw of candidates) {
      const n = Number(raw);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
    return null;
  }

  function isImportantLeaguePlayer(item) {
    return isImportantPlayer(item);
  }

  function itemTypeMatches(item, stringNames, numericIds, itemTypeKeys) {
    const t = getItemTypeValue(item);
    if (t == null) return false;
    if (typeof t === 'string') {
      const s = t.toLowerCase();
      if (stringNames.some((name) => s === name || s.includes(name))) {
        return true;
      }
    }
    const n = Number(t);
    if (Number.isFinite(n) && numericIds.includes(n)) return true;
    const ItemType = win.ItemType;
    if (ItemType && itemTypeKeys?.length) {
      for (const key of itemTypeKeys) {
        try {
          if (ItemType[key] != null && t === ItemType[key]) return true;
        } catch {
          /* ignore */
        }
      }
    }
    return false;
  }

  function isBadgeItem(item) {
    if (!item || isPlayer(item) || isManager(item)) return false;
    try {
      if (typeof item.isBadge === 'function' && item.isBadge()) return true;
    } catch {
      /* ignore */
    }
    return itemTypeMatches(
      item,
      ['badge', 'custom', 'crest', 'clubbadge'],
      [11],
      ['BADGE', 'Badge', 'CUSTOM', 'Custom']
    );
  }

  function isKitItem(item) {
    if (!item || isPlayer(item) || isManager(item)) return false;
    try {
      if (typeof item.isKit === 'function' && item.isKit()) return true;
    } catch {
      /* ignore */
    }
    return itemTypeMatches(item, ['kit'], [9], ['KIT', 'Kit']);
  }

  function isBallItem(item) {
    if (!item || isPlayer(item) || isManager(item)) return false;
    try {
      if (typeof item.isBall === 'function' && item.isBall()) return true;
    } catch {
      /* ignore */
    }
    return itemTypeMatches(item, ['ball'], [30], ['BALL', 'Ball']);
  }

  function logUnknownVanityOnce(item) {
    if (!state.loggedUnknownVanityKeys) {
      state.loggedUnknownVanityKeys = new Set();
    }
    const key = [
      getItemTypeValue(item),
      item?.definitionId ?? item?._meta?.id ?? '',
      getItemDisplayName(item),
    ].join('|');
    if (state.loggedUnknownVanityKeys.has(key)) return;
    state.loggedUnknownVanityKeys.add(key);
    log('Unknown item shape → group action', {
      type: getItemTypeValue(item),
      definitionId: item?.definitionId ?? item?._meta?.id,
      name: getItemDisplayName(item),
      duplicate: isDuplicate(item),
    });
  }

  function itemSubtypeValue(item) {
    try {
      if (typeof item?.getSubType === 'function') {
        const value = item.getSubType();
        if (value != null && value !== '') return value;
      }
    } catch {
      /* ignore */
    }
    return item?.subtype ?? item?._subtype ?? null;
  }

  function itemSubtypeIs(item, names) {
    const value = itemSubtypeValue(item);
    if (value == null || !names?.length) return false;
    const table = win.ItemSubType;
    if (table) {
      for (const name of names) {
        try {
          if (table[name] != null && value === table[name]) return true;
        } catch {
          /* ignore */
        }
      }
    }
    const text = String(value);
    return names.some((name) => text === name);
  }

  function itemFlag(item, method) {
    try {
      return typeof item?.[method] === 'function' && !!item[method]();
    } catch {
      return false;
    }
  }

  function classifyVanityKind(item) {
    if (itemFlag(item, 'isHealth')) return 'healing';
    if (itemFlag(item, 'isManagerLeagueModifier')) return 'managerLeague';
    if (itemFlag(item, 'isTraining') || itemFlag(item, 'isConsumable')) return 'chemistry';
    for (const entry of vanityCatalogItems()) {
      if (entry.methods?.some((method) => itemFlag(item, method))) return entry.id;
      if (entry.subtypes && itemSubtypeIs(item, entry.subtypes)) return entry.id;
    }
    if (isStadiumItem(item)) return 'stadium';
    if (isKitItem(item)) return 'kit';
    if (isBallItem(item)) return 'ball';
    if (isBadgeItem(item)) return 'badge';
    return null;
  }

  /**
   * Classify a pack pull for companion pack-rules routing.
   * @returns {{ kind: string, duplicate: boolean, important: boolean }}
   */
  function classifyPackItem(item) {
    const duplicate = isDuplicate(item);
    if (isPlayer(item)) {
      return {
        kind: 'player',
        duplicate,
        important: isImportantPlayer(item),
      };
    }
    if (isManager(item)) {
      return {
        kind: 'manager',
        duplicate,
        important: isImportantManager(item),
      };
    }
    const vanityKind = classifyVanityKind(item);
    if (!vanityKind) logUnknownVanityOnce(item);
    return { kind: vanityKind || 'unknown', duplicate, important: false };
  }

  function isPriceListDuplicatePlayer(item) {
    return (
      isPlayerPriceModeConfigured() &&
      isPlayer(item) &&
      isDuplicate(item) &&
      isImportantLeaguePlayer(item)
    );
  }

  /** Companion pack rules are always active for Pack Opener once migrated. */
  function isPackRulesActive() {
    return true;
  }

  /**
   * EA List-on-TM starting-bid floor (getAbsoluteMin / _itemPriceLimits.minimum).
   * Often 150 for bronze players, 350 for raised gold vanity, etc. — not the BIN floor.
   */
  function getMinStartPrice(item) {
    if (!item) return 150;

    try {
      if (typeof item.getAbsoluteMin === 'function') {
        const abs = Number(item.getAbsoluteMin());
        if (Number.isFinite(abs) && abs > 0) return abs;
      }
    } catch {
      /* ignore */
    }

    const limits = item._itemPriceLimits || item.itemPriceLimits;
    const fromLimits = Number(limits?.minimum);
    if (Number.isFinite(fromLimits) && fromLimits > 0) return fromLimits;

    const marketMin = Number(
      item.marketDataMinPrice ?? item._marketData?.minPrice ?? item._meta?.marketDataMinPrice
    );
    if (Number.isFinite(marketMin) && marketMin > 0) return marketMin;

    // Unknown: classic bronze start floor
    return 150;
  }

  /** @deprecated use getMinStartPrice — kept as alias for logs / older call sites */
  function getMinListPrice(item) {
    return getMinStartPrice(item);
  }

  /**
   * Lowest Buy-Now allowed on List on Transfer Market: one market step above the
   * start-price floor (150→200, 350→400 for many badges/kits, etc.).
   */
  function getMinBuyNowPrice(item) {
    return stepAbove(getMinStartPrice(item));
  }

  function getRealSelectValue(select) {
    if (!select || select.selectedIndex < 0) return null;
    return select.options[select.selectedIndex]?.value ?? null;
  }

  function setSelectValue(select, value) {
    if (!select) return;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === value) {
        select.selectedIndex = i;
        return;
      }
    }
  }

  function toPromise(observable) {
    return new Promise((resolve, reject) => {
      try {
        observable.observe(null, (sender, response) => {
          try {
            if (sender && typeof sender.unobserve === 'function') {
              sender.unobserve(null);
            }
          } catch {
            /* ignore */
          }
          resolve(response);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  function asObservable(executor) {
    return {
      observe(ctx, callback) {
        Promise.resolve()
          .then(executor)
          .then((response) => {
            callback.call(ctx, { unobserve() {} }, response);
          })
          .catch((err) => {
            callback.call(
              ctx,
              { unobserve() {} },
              { success: false, status: err }
            );
          });
      },
    };
  }

  function readTransferListFullSelect(root) {
    const scope = root && typeof root.querySelector === 'function' ? root : win.document;
    const select = scope.querySelector(SELECTORS.transferListFull);
    if (!select) return null;
    return getRealSelectValue(select) || select.value || null;
  }

  function rememberTransferListFullAction(root) {
    const value = readTransferListFullSelect(root);
    if (!value) return state.tlFullAction || 'stopProcess';
    state.tlFullAction = value;
    return value;
  }

  function getTransferListFullAction() {
    const live = readTransferListFullSelect();
    if (live) {
      state.tlFullAction = live;
      return live;
    }
    // The Pack Opener dialog is gone while packs are opening.
    return state.tlFullAction || 'stopProcess';
  }

  function realTransferPileFull() {
    try {
      const repos = win.repositories?.Item;
      const pile = win.ItemPile?.TRANSFER;
      if (!repos || pile == null) return false;
      const isPileFull = state.originalIsPileFull || repos.isPileFull;
      if (typeof isPileFull === 'function') return !!isPileFull.call(repos, pile);
      if (typeof repos.isFull === 'function') return !!repos.isFull(pile);
    } catch {
      /* ignore */
    }
    return false;
  }

  function repositoriesTransferFull() {
    return realTransferPileFull();
  }

  function cachedPileItems(pileRepo) {
    if (!pileRepo) return [];
    try {
      if (typeof pileRepo.values === 'function') {
        const values = pileRepo.values();
        return Array.isArray(values) ? values.filter(Boolean) : [...values].filter(Boolean);
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  function pileRepoHasId(pileRepo, id) {
    if (!pileRepo || id == null) return false;
    try {
      if (typeof pileRepo.get === 'function' && pileRepo.get(id)) return true;
    } catch {
      /* ignore */
    }
    try {
      if (typeof pileRepo.has === 'function' && pileRepo.has(id)) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  function packItemCacheId(item) {
    let fromGetter = null;
    try {
      fromGetter = typeof item?.getId === 'function' ? item.getId() : null;
    } catch {
      fromGetter = null;
    }
    const raw = item?.id ?? item?._id ?? fromGetter;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function samePackItem(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const idA = packItemCacheId(a);
    return idA != null && idA === packItemCacheId(b);
  }

  /** True when the card is already sitting on the transfer list. */
  function itemIsOnTransfer(item) {
    if (!item) return false;
    const pile = item.pile ?? item._pile;
    const transfer = win.ItemPile?.TRANSFER;
    if (transfer != null && pile === transfer) return true;
    const id = packItemCacheId(item);
    const repo = win.repositories?.Item?.transfer;
    if (id != null && pileRepoHasId(repo, id)) return true;
    if (id == null) return false;
    return cachedPileItems(repo).some((other) => packItemCacheId(other) === id);
  }

  function transferPileCount() {
    const repos = win.repositories?.Item;
    const pile = win.ItemPile?.TRANSFER;
    try {
      if (repos && pile != null && typeof repos.numItemsInCache === 'function') {
        const n = Number(repos.numItemsInCache(pile));
        if (Number.isFinite(n) && n >= 0) return n;
      }
    } catch {
      /* ignore */
    }
    const repo = repos?.transfer;
    if (typeof repo?.length === 'number') return repo.length;
    return cachedPileItems(repo).length;
  }

  /** True when the list cannot take `incomingCount` more cards. */
  function transferListNeedsRoom(incomingCount) {
    if (repositoriesTransferFull()) return true;
    const incoming = Math.max(1, Number(incomingCount) || 1);
    return transferPileCount() + incoming > TRANSFER_LIST_CAPACITY;
  }

  /**
   * Cards from this batch that are still in the unassigned pile.
   * A move response can look successful while the list was full and the card stayed.
   */
  function itemsStillUnassigned(items) {
    const repo = win.repositories?.Item;
    const purchased = win.ItemPile?.PURCHASED;
    const unassignedIds = new Set(
      cachedPileItems(repo?.unassigned)
        .map((item) => packItemCacheId(item))
        .filter((id) => id != null)
    );
    return (items || []).filter((item) => {
      const id = packItemCacheId(item);
      const pile = item?.pile ?? item?._pile;
      if (pile != null && purchased != null && pile !== purchased) return false;
      if (id != null && pileRepoHasId(repo?.transfer, id)) return false;
      if (id != null && pileRepoHasId(repo?.club, id)) return false;
      if (id != null && unassignedIds.has(id)) return true;
      return purchased != null && pile === purchased;
    });
  }

  /**
   * Paletools starts every pack with numItemsInCache(PURCHASED). That is the
   * unassigned array length, and any leftover stops the run. Drop only cards
   * that already left the purchased pile. A card that is still unassigned
   * stays, so a full transfer list can be cleared before the next pack.
   */
  function pruneUnassignedAlreadyMoved() {
    const repo = win.repositories?.Item;
    const purchased = win.ItemPile?.PURCHASED;
    if (!repo?.unassigned || purchased == null || typeof repo.unassigned.remove !== 'function') {
      return 0;
    }
    let removed = 0;
    for (const item of cachedPileItems(repo.unassigned)) {
      const pile = item?.pile ?? item?._pile;
      const id = packItemCacheId(item);
      if (id == null) continue;
      const moved = pile != null && pile !== purchased;
      const onTransfer = pileRepoHasId(repo.transfer, id);
      const inClub = pileRepoHasId(repo.club, id);
      if (!moved && !onTransfer && !inClub) continue;
      try {
        repo.unassigned.remove(id);
        removed++;
      } catch {
        /* ignore */
      }
    }
    if (removed) {
      log('Dropped moved items from the unassigned cache', { removed });
    }
    return removed;
  }

  /**
   * While Free space and continue is selected and cleanup has not given up,
   * Paletools must not treat the pile as full (that would quick-sell or stop
   * before Companion can clear it). Companion still uses the real check.
   */
  function paletoolsShouldIgnoreTransferFull() {
    return (
      state.packOpenerRunning &&
      !state.tlFullCleanupGaveUp &&
      !state.tlFullCleanupPromise &&
      getTransferListFullAction() === TL_FULL_FREE_SPACE
    );
  }

  function installTransferFullMask() {
    const repos = win.repositories?.Item;
    const pileConst = win.ItemPile?.TRANSFER;
    if (!repos || pileConst == null || typeof repos.isPileFull !== 'function') {
      return false;
    }
    if (repos.isPileFull.__companionTlFullMask) return true;
    const original = repos.isPileFull.bind(repos);
    state.originalIsPileFull = original;
    function maskedIsPileFull(pile, ...rest) {
      if (pile === pileConst && paletoolsShouldIgnoreTransferFull()) {
        return false;
      }
      return original(pile, ...rest);
    }
    maskedIsPileFull.__companionTlFullMask = true;
    repos.isPileFull = maskedIsPileFull;
    log('Transfer-list full mask installed');
    return true;
  }

  function notifyCompanion(message) {
    try {
      win.services?.Notification?.queue?.([
        message,
        win.UINotificationType?.NEUTRAL ?? 0,
      ]);
    } catch {
      /* ignore */
    }
  }

  function markTransferPileDirty() {
    try {
      const repos = win.repositories?.Item;
      const pile = win.ItemPile?.TRANSFER;
      if (repos && pile != null && typeof repos.setDirty === 'function') {
        repos.setDirty(pile);
      }
    } catch {
      /* ignore */
    }
  }

  function itemAuction(item) {
    try {
      if (typeof item?.getAuctionData === 'function') return item.getAuctionData();
    } catch {
      /* ignore */
    }
    return item?._auctionData || item?.auctionData || null;
  }

  function transferAuctionState(item) {
    try {
      const auction = itemAuction(item);
      if (!auction) return 'none';
      if (typeof auction.isActive === 'function' && auction.isActive()) return 'active';
      if (typeof auction.isSold === 'function' && auction.isSold()) return 'closed';
      if (typeof auction.isClosed === 'function' && auction.isClosed()) return 'closed';
      if (typeof auction.isExpired === 'function' && auction.isExpired()) return 'expired';
      if (typeof auction.isValid === 'function' && !auction.isValid()) return 'unlisted';
      const state = auction.tradeState ?? auction._tradeState ?? auction.state;
      const Enum = win.AuctionTradeStateEnum;
      if (Enum) {
        if (state === Enum.ACTIVE) return 'active';
        if (state === Enum.CLOSED) return 'closed';
        if (state === Enum.EXPIRED) return 'expired';
        if (state === Enum.INACTIVE) return 'inactive';
      }
      const text = String(state ?? '').toLowerCase();
      if (text === '0' || text === 'inactive') return 'inactive';
      if (text === '1' || text === 'active') return 'active';
      if (text === '2' || text === 'closed' || text === 'sold') return 'closed';
      if (text === '3' || text === 'expired') return 'expired';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /** 0 / missing means the card is not a club duplicate. A positive id cannot move to club. */
  function duplicateIdOf(item) {
    const raw =
      item?.duplicateId ??
      item?._duplicateId ??
      item?.duplicateItemId ??
      null;
    if (raw == null || raw === '') return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Unlisted transfer-list card: not on the market and not an expired listing
   * waiting to be relisted. Same signal Paletools uses: !getAuctionData().isValid().
   */
  function isUnlistedOnTransferList(item) {
    const auctionState = transferAuctionState(item);
    if (
      auctionState === 'unlisted' ||
      auctionState === 'inactive' ||
      auctionState === 'none'
    ) {
      return true;
    }
    // No auction methods and no recognized trade state. A valid auction is left
    // alone so an active or expired listing is not sent to the club.
    if (auctionState !== 'unknown') return false;
    const auction = itemAuction(item);
    if (auction && typeof auction.isValid === 'function' && auction.isValid()) return false;
    return true;
  }

  /** Only unlisted non-duplicates can be sent to the club. */
  function isSendableNonDuplicate(item) {
    if (!item) return false;
    if (duplicateIdOf(item) > 0) return false;
    return isUnlistedOnTransferList(item);
  }

  function findClearSoldFunction() {
    const Item = win.services?.Item;
    if (!Item) return null;
    const names = [
      'clearSoldItems',
      'clearSold',
      'removeSoldItems',
      'removeSold',
      'deleteSoldItems',
      'discardSoldItems',
    ];
    const seen = new Set();
    let obj = Item;
    while (obj && obj !== Object.prototype && !seen.has(obj)) {
      seen.add(obj);
      for (const name of names) {
        const fn = obj[name];
        if (typeof fn === 'function') return fn.bind(Item);
      }
      let keys = [];
      try {
        keys = Object.getOwnPropertyNames(obj);
      } catch {
        keys = [];
      }
      for (const key of keys) {
        let fn = null;
        try {
          fn = obj[key];
        } catch {
          continue;
        }
        if (
          typeof fn === 'function' &&
          /sold/i.test(key) &&
          /clear|remove|delete|discard/i.test(key)
        ) {
          return fn.bind(Item);
        }
      }
      obj = Object.getPrototypeOf(obj);
    }
    return null;
  }

  function awaitServiceResult(result) {
    if (result && typeof result.observe === 'function') return toPromise(result);
    if (result && typeof result.then === 'function') return result;
    return Promise.resolve(result);
  }

  /** Payload-only soft-ban check. Recent market HTTP codes must not abort TL cleanup. */
  function isSoftBanPayload(value) {
    if (value === 'ERROR') return true;
    if (value == null) return false;
    const codes = collectStatusCodes(value);
    if (codes.some((c) => SOFT_BAN_STATUS_CODES.has(c))) return true;
    const text = softBanMessageText(value);
    return !!(text && SOFT_BAN_MESSAGE_RE.test(text));
  }

  async function fetchTransferPileItems() {
    const request = win.services?.Item?.requestTransferItems;
    if (typeof request !== 'function') {
      return { softban: false, items: [] };
    }
    try {
      const response = await toPromise(request.call(win.services.Item));
      if (isSoftBanPayload(response)) {
        return { softban: true, items: [], raw: response };
      }
      return {
        softban: false,
        items: extractItemsFromObserveResponse(response),
        raw: response,
      };
    } catch (err) {
      log('requestTransferItems failed during free-space', err);
      return {
        softban: isSoftBanPayload(err),
        items: [],
        raw: err,
      };
    }
  }

  async function clearSoldTransferItems() {
    const clearSold = findClearSoldFunction();
    if (!clearSold) {
      log('Clear-sold API unavailable');
      return { success: false, missing: true };
    }
    await pace('move');
    const response = await awaitServiceResult(clearSold());
    const success = responseSucceeded(response);
    if (!success) await paceRateLimitBackoff('clear-sold-failed');
    markTransferPileDirty();
    log('Cleared sold transfer-list items', {
      success,
      softban: isSoftBanPayload(response),
    });
    return { success, raw: response, softban: isSoftBanPayload(response) };
  }

  function clubItemIdentityIds(item) {
    const ids = [];
    let fromGetter = null;
    try {
      fromGetter = typeof item?.getId === 'function' ? item.getId() : null;
    } catch {
      fromGetter = null;
    }
    for (const raw of [item?.id, item?.resourceId, item?._id, fromGetter]) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0 && !ids.includes(n)) ids.push(n);
    }
    return ids;
  }

  function rememberUsedClubItems(target, items) {
    for (const item of items || []) {
      for (const id of clubItemIdentityIds(item)) target.add(id);
    }
  }

  /** Drop duplicate links for club cards that were just submitted into an SBC. */
  function clearFreedDuplicateIds(items, usedClubIds) {
    if (!usedClubIds?.size) return 0;
    let cleared = 0;
    for (const item of items || []) {
      const dup = duplicateIdOf(item);
      if (!(dup > 0) || !usedClubIds.has(dup)) continue;
      item.duplicateId = 0;
      if (item._duplicateId != null) item._duplicateId = 0;
      if (item.duplicateItemId != null) item.duplicateItemId = 0;
      cleared++;
    }
    return cleared;
  }

  async function sendNonDuplicateTransferItemsToClub(usedClubIds) {
    const freedIds =
      usedClubIds instanceof Set ? usedClubIds : new Set(usedClubIds || []);
    let moved = 0;
    let skipped = null;
    let ok = true;
    for (let pass = 0; pass < 2; pass++) {
      if (pass > 0) await pace('move');
      const pile = await fetchTransferPileItems();
      if (pile.softban) return { success: false, softban: true, moved, skipped };
      const items = pile.items || [];
      const cleared = clearFreedDuplicateIds(items, freedIds);
      const targets = items.filter(isSendableNonDuplicate);
      skipped = {
        total: items.length,
        sendable: targets.length,
        duplicates: items.filter((item) => duplicateIdOf(item) > 0).length,
        active: items.filter((item) => transferAuctionState(item) === 'active').length,
        expired: items.filter((item) => transferAuctionState(item) === 'expired').length,
        sold: items.filter((item) => transferAuctionState(item) === 'closed').length,
        unknown: items.filter((item) => transferAuctionState(item) === 'unknown').length,
        duplicateLinksCleared: cleared,
      };
      if (!targets.length) {
        log('No unlisted non-duplicates to send to club', { pass: pass + 1, ...skipped });
        // The pile fetched right after an SBC can still call these cards duplicates.
        if (pass === 0 && freedIds.size) continue;
        break;
      }
      const result = await moveToClub(targets);
      const softban = isSoftBanPayload(result.raw) || isSoftBanPayload(result.error);
      if (softban) return { success: false, softban: true, moved, skipped };
      if (!result.success) {
        log('Send unlisted non-duplicates failed', { pass: pass + 1, ...skipped });
        if (pass === 0) continue;
        ok = false;
        break;
      }
      ok = true;
      moved += targets.length;
      markTransferPileDirty();
      log('Sent unlisted non-duplicates to club in one move', {
        pass: pass + 1,
        candidates: targets.length,
        moved,
        skipped,
      });
    }
    return { success: ok, moved, skipped };
  }

  /**
   * Pause the current pack (caller awaits this), clear sold, send non-duplicates
   * to club, then report whether the transfer list has room.
   * Gives up for the rest of the run if a pass frees nothing.
   * @returns {'room'|'none'|'softban'}
   */
  function freeTransferListSpace() {
    if (state.tlFullCleanupGaveUp) return Promise.resolve('none');
    if (state.tlFullCleanupPromise) return state.tlFullCleanupPromise;
    state.tlFullCleanupPromise = performTransferListCleanup().finally(() => {
      state.tlFullCleanupPromise = null;
    });
    return state.tlFullCleanupPromise;
  }

  async function performTransferListCleanup() {
    try {
      return await runTransferListCleanupBody();
    } catch (err) {
      log('Transfer-list cleanup failed', err);
      state.tlFullCleanupGaveUp = true;
      if (isSoftBanSignal(err)) {
        requestPackOpenerSoftBanStop({ source: 'tl-full-cleanup', err });
        return 'softban';
      }
      notifyCompanion(
        'Companion: transfer list cleanup failed — stopping.'
      );
      return 'none';
    }
  }

  function emptyTlFullSbcChoice(choice) {
    return !choice || (!choice.challengeId && !choice.setId && !choice.templateKey);
  }

  function getTlFullSbcChoice() {
    if (state.tlFullSbcChoice !== undefined) return state.tlFullSbcChoice;
    const saved = readJson(STORAGE_TL_FULL_SBC, null);
    let choice = null;
    if (typeof saved === 'number' || typeof saved === 'string') {
      choice = choiceFromTemplateKey(String(saved));
    } else if (saved && typeof saved === 'object') {
      const templateKey = saved.templateKey ? String(saved.templateKey) : '';
      const setId = Number(saved.setId) > 0 ? Number(saved.setId) : null;
      const challengeId = Number(saved.challengeId) > 0 ? Number(saved.challengeId) : null;
      if (templateKey || setId || challengeId) {
        choice = {
          templateKey: templateKey || (setId && !challengeId ? `s${setId}` : String(challengeId || '')),
          setId,
          challengeId,
        };
      }
    }
    state.tlFullSbcChoice = choice;
    return choice;
  }

  function setTlFullSbcChoice(choice) {
    state.tlFullSbcChoice = emptyTlFullSbcChoice(choice) ? null : choice;
    writeJson(STORAGE_TL_FULL_SBC, state.tlFullSbcChoice);
  }

  function choiceFromTemplateKey(key) {
    const text = String(key || '').trim();
    if (!text) return null;
    const setMatch = /^s(\d+)$/i.exec(text);
    if (setMatch) {
      const setId = Number(setMatch[1]);
      const previous = state.tlFullSbcChoice;
      return {
        templateKey: `s${setId}`,
        setId,
        challengeId:
          previous && previous.templateKey === `s${setId}` ? previous.challengeId || null : null,
      };
    }
    const challengeId = Number(text);
    if (!(challengeId > 0)) return null;
    const previous = state.tlFullSbcChoice;
    return {
      templateKey: String(challengeId),
      challengeId,
      setId:
        previous && previous.templateKey === String(challengeId) ? previous.setId || null : null,
    };
  }

  function rememberTlFullSbcChoice(root) {
    const scope = root && typeof root.querySelector === 'function' ? root : win.document;
    const select = scope.querySelector('#companion-tl-full-sbc-select');
    if (!select) return getTlFullSbcChoice();
    const key = getRealSelectValue(select);
    if (!key) {
      if (select.dataset.companionReady !== '1') return getTlFullSbcChoice();
      setTlFullSbcChoice(null);
      return null;
    }
    const choice = choiceFromTemplateKey(key);
    if (!choice) return getTlFullSbcChoice();
    setTlFullSbcChoice(choice);
    return choice;
  }

  function iterCollection(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
      if (typeof value.values === 'function') {
        const values = value.values();
        return (Array.isArray(values) ? values : Array.from(values)).filter(Boolean);
      }
    } catch {
      /* ignore */
    }
    try {
      return Array.from(value).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Cache-hit calls notify before they return the observable.
   * Only that observable's own notify counts. Other notifies during the
   * call belong to nested requests and are not the result.
   */
  function awaitObservable(factory) {
    const proto = win.EAObservable?.prototype;
    const original = proto?.notify;
    const notes = [];
    if (proto && typeof original === 'function') {
      proto.notify = function notifyDuringCall(response) {
        notes.push({ self: this, response });
        return original.apply(this, arguments);
      };
    }
    let observable;
    try {
      observable = factory();
    } finally {
      if (proto && typeof original === 'function') proto.notify = original;
    }
    const own = notes.filter((note) => note.self === observable);
    if (own.length) return Promise.resolve(own[own.length - 1].response);
    if (!observable || typeof observable.observe !== 'function') {
      return Promise.resolve(observable ?? null);
    }
    return Promise.race([
      toPromise(observable),
      sleep(20000).then(() => null),
    ]);
  }

  function personaId() {
    try {
      const persona = win.services?.User?.getUser?.()?.selectedPersona;
      if (persona == null) return null;
      if (typeof persona === 'object') return persona.id ?? persona.personaId ?? null;
      return persona;
    } catch {
      return null;
    }
  }

  function idbCursorRows(db, storeName) {
    return new Promise((resolve) => {
      const out = [];
      let cursorReq;
      try {
        cursorReq = db.transaction(storeName, 'readonly').objectStore(storeName).openCursor();
      } catch (err) {
        log('IndexedDB cursor failed', { storeName, err });
        resolve([]);
        return;
      }
      cursorReq.onerror = () => resolve(out);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve(out);
          return;
        }
        out.push({ key: cursor.key, value: cursor.value });
        cursor.continue();
      };
    });
  }

  function idbReadDirect(dbName, storeNames) {
    return new Promise((resolve) => {
      let request;
      try {
        request = win.indexedDB.open(dbName);
      } catch (err) {
        log('IndexedDB open failed', { dbName, err });
        resolve(null);
        return;
      }
      let settled = false;
      const timer = win.setTimeout(() => finish(null), 1500);
      const finish = (value) => {
        if (settled) return;
        settled = true;
        win.clearTimeout(timer);
        resolve(value);
      };
      request.onerror = () => finish(null);
      request.onsuccess = async () => {
        const db = request.result;
        try {
          const stores = Array.from(db.objectStoreNames || []);
          const rows = {};
          for (const name of storeNames) {
            rows[name] = stores.includes(name) ? await idbCursorRows(db, name) : [];
          }
          db.close();
          finish({ stores, rows });
        } catch (err) {
          try {
            db.close();
          } catch {
            /* ignore */
          }
          log('IndexedDB read failed', { dbName, err });
          finish(null);
        }
      };
    });
  }

  function idbReadInPage(dbName, storeNames) {
    return new Promise((resolve) => {
      const requestId = `companion-idb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const timer = win.setTimeout(() => {
        win.removeEventListener('message', onMessage);
        resolve(null);
      }, 4000);
      function onMessage(event) {
        const data = event?.data;
        if (!data || data.source !== 'paletools-companion-idb' || data.requestId !== requestId) {
          return;
        }
        win.clearTimeout(timer);
        win.removeEventListener('message', onMessage);
        resolve(data.payload || null);
      }
      win.addEventListener('message', onMessage);
      try {
        const runner = win.Function(
          'dbName',
          'storeNames',
          'requestId',
          `const finish = (payload) => {
            window.postMessage({ source: 'paletools-companion-idb', requestId, payload }, '*');
          };
          let req;
          try { req = indexedDB.open(dbName); }
          catch (err) { finish({ error: String(err && err.message || err) }); return; }
          req.onerror = () => finish({ error: 'open-failed' });
          req.onsuccess = () => {
            const db = req.result;
            const stores = Array.from(db.objectStoreNames || []);
            const present = storeNames.filter((name) => stores.includes(name));
            if (!present.length) {
              db.close();
              finish({ stores, rows: {} });
              return;
            }
            const rows = {};
            let pending = present.length;
            const tx = db.transaction(present, 'readonly');
            const settle = () => {
              pending -= 1;
              if (pending > 0) return;
              db.close();
              finish({ stores, rows });
            };
            for (const name of present) {
              const out = [];
              const cursor = tx.objectStore(name).openCursor();
              cursor.onerror = () => { rows[name] = out; settle(); };
              cursor.onsuccess = () => {
                const current = cursor.result;
                if (current) {
                  const value = current.value;
                  const steps = value && (Array.isArray(value.steps) ? value.steps : (Array.isArray(value) ? value : null));
                  out.push({
                    key: current.key,
                    value: {
                      challengeId: value && value.challengeId,
                      id: value && value.id,
                      userId: value && value.userId,
                      name: value && value.name,
                      stepCount: steps ? steps.length : 0,
                      globalTemplateId: value && value.globalTemplateId || null,
                    },
                  });
                  current.continue();
                  return;
                }
                rows[name] = out;
                settle();
              };
            }
          };`
        );
        runner(dbName, storeNames, requestId);
      } catch (err) {
        win.clearTimeout(timer);
        win.removeEventListener('message', onMessage);
        log('Page IndexedDB read failed', err);
        resolve(null);
      }
    });
  }

  function templateRecordFromEntry(entry) {
    const value = entry?.value ?? entry;
    const key = entry?.key;
    let challengeId = value?.challengeId;
    if (challengeId == null && Array.isArray(key)) challengeId = key[1];
    if (challengeId == null && value?.id != null) challengeId = value.id;
    if (challengeId == null) return null;
    const steps = Array.isArray(value?.steps)
      ? value.steps
      : Array.isArray(value)
        ? value
        : null;
    const stepCount = steps ? steps.length : Number(value?.stepCount) || 0;
    const globalTemplateId =
      typeof value?.globalTemplateId === 'string' && value.globalTemplateId
        ? value.globalTemplateId
        : null;
    if (!stepCount && !globalTemplateId) return null;
    return {
      challengeId,
      userId: value?.userId ?? (Array.isArray(key) ? key[0] : null),
      name: value?.name || null,
      stepCount,
      globalTemplateId,
    };
  }

  function rowsForPersona(rows) {
    const persona = personaId();
    const usable = (rows || []).map(templateRecordFromEntry).filter(Boolean);
    const mine =
      persona == null
        ? usable
        : usable.filter((row) => {
            const userId = row.userId;
            return (
              userId == null ||
              String(userId) === String(persona) ||
              String(userId) === String(persona?.id)
            );
          });
    return {
      persona,
      rows: mine.length ? mine : usable,
      total: usable.length,
      forPersona: mine.length,
    };
  }

  async function readSavedSbcTemplateRows() {
    const storeNames = ['sbcTemplates', 'globalSbcTemplates'];
    let payload = await idbReadDirect('paletools', storeNames);
    const directCount = (payload?.rows?.sbcTemplates || []).length;
    if (!directCount) {
      const pagePayload = await idbReadInPage('paletools', storeNames);
      const pageCount = (pagePayload?.rows?.sbcTemplates || []).length;
      if (pageCount || !payload) payload = pagePayload || payload;
    }
    const challenge = rowsForPersona(payload?.rows?.sbcTemplates || []);
    const globalTemplates = rowsForPersona(payload?.rows?.globalSbcTemplates || []);
    log('Saved SBC templates', {
      stores: payload?.stores || [],
      error: payload?.error || '',
      total: challenge.total,
      forPersona: challenge.forPersona,
      persona: challenge.persona,
      keys: challenge.rows.slice(0, 40).map((row) => row.challengeId),
      globalTemplates: globalTemplates.total,
    });
    state.tlFullSbcGlobalNames = new Map(
      globalTemplates.rows
        .filter((row) => row.name)
        .map((row) => [String(row.challengeId), row.name])
    );
    return challenge.rows;
  }

  function challengeFromSet(set, challengeId) {
    try {
      if (typeof set?.getChallenge === 'function') {
        const challenge = set.getChallenge(challengeId);
        if (challenge) return challenge;
      }
      if (set?.challenges && typeof set.challenges.get === 'function') {
        return set.challenges.get(challengeId) || null;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function challengeLabel(set, challenge) {
    const setName = set?.name || set?._name || `Set ${set?.id ?? ''}`;
    const challengeName =
      challenge?.name || challenge?._name || `Challenge ${challenge?.id ?? ''}`;
    return `${setName} — ${challengeName}`;
  }

  function collectSbcSets() {
    const repo = win.repositories?.SBC;
    const sets = [];
    const seen = new Set();
    const add = (set) => {
      if (!set || typeof set !== 'object') return;
      const id = Number(set.id);
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
      seen.add(id);
      sets.push(set);
    };
    try {
      if (typeof repo?.sets?.values === 'function') {
        for (const set of iterCollection(repo.sets.values())) add(set);
      }
    } catch {
      /* ignore */
    }
    for (const set of iterCollection(typeof repo?.getSets === 'function' ? repo.getSets() : null)) {
      add(set);
    }
    for (const set of state.tlFullSbcSetList || []) add(set);
    return sets;
  }

  function expireSbcSetCache() {
    const repo = win.repositories?.SBC;
    try {
      if (typeof repo?.setCacheTimestamp === 'function') repo.setCacheTimestamp(0);
      else if (repo) repo.cacheExpiration = 0;
    } catch {
      /* ignore */
    }
  }

  async function loadSbcSets({ force = false } = {}) {
    const repo = win.repositories?.SBC;
    if (!force) {
      const cached = collectSbcSets();
      if (cached.length) return { sets: cached };
    } else {
      expireSbcSetCache();
    }
    if (typeof win.services?.SBC?.requestSets !== 'function') {
      return { sets: collectSbcSets() };
    }
    await pace('move');
    const response = await awaitObservable(() => win.services.SBC.requestSets());
    if (isSoftBanPayload(response)) return { softban: true, sets: [] };
    const sets = collectSbcSets();
    if (sets.length) return { sets };
    return { sets: iterCollection(response?.data?.sets) };
  }

  async function findSbcChallenge(choice) {
    if (!choice?.challengeId && !choice?.setId) return null;
    const loaded = await loadSbcSets();
    if (loaded.softban) return { softban: true };
    const sets = loaded.sets || [];
    const repo = win.repositories?.SBC;
    if (choice.setId && !choice.challengeId) {
      const set =
        (typeof repo?.getSetById === 'function' && repo.getSetById(choice.setId)) ||
        sets.find((entry) => Number(entry.id) === Number(choice.setId)) ||
        null;
      if (!set) {
        log('Saved SBC set was not found', { setId: choice.setId });
        return null;
      }
      let challenges = iterCollection(
        typeof set.getChallenges === 'function' ? set.getChallenges() : null
      );
      if (!challenges.length && typeof win.services?.SBC?.requestChallengesForSet === 'function') {
        await pace('move');
        const response = await awaitObservable(() => win.services.SBC.requestChallengesForSet(set));
        if (isSoftBanPayload(response)) return { softban: true };
        challenges = iterCollection(
          typeof set.getChallenges === 'function' ? set.getChallenges() : null
        );
      }
      const challenge = challenges[0] || null;
      if (!challenge) {
        log('Saved SBC set has no challenge', { setId: set.id });
        return null;
      }
      const foundChoice = {
        templateKey: choice.templateKey || `s${set.id}`,
        setId: Number(set.id) || null,
        challengeId: Number(challenge.id) || null,
      };
      setTlFullSbcChoice(foundChoice);
      log('Found saved SBC challenge', {
        templateKey: foundChoice.templateKey,
        challengeId: foundChoice.challengeId,
        setId: set.id,
        label: challengeLabel(set, challenge),
      });
      return { set, challenge };
    }
    const ordered = [];
    if (choice.setId && typeof repo?.getSetById === 'function') {
      const preferred = repo.getSetById(choice.setId);
      if (preferred) ordered.push(preferred);
    }
    for (const set of sets) {
      if (!ordered.includes(set)) ordered.push(set);
    }

    const needsFetch = [];
    for (const set of ordered) {
      const existing = challengeFromSet(set, choice.challengeId);
      if (existing) {
        const found = { set, challenge: existing };
        setTlFullSbcChoice({
          templateKey: choice.templateKey || String(choice.challengeId),
          challengeId: choice.challengeId,
          setId: Number(set.id) || choice.setId || null,
        });
        log('Found saved SBC challenge', {
          challengeId: choice.challengeId,
          setId: set.id,
          label: challengeLabel(set, existing),
        });
        return found;
      }
      const known = iterCollection(
        typeof set.getChallenges === 'function' ? set.getChallenges() : null
      );
      if (!known.length) needsFetch.push(set);
    }

    log('SBC sets to scan for saved template', { count: needsFetch.length });
    if (choice.setId) {
      const preferredId = Number(choice.setId);
      needsFetch.sort((a, b) => (Number(a.id) === preferredId ? 0 : 1) - (Number(b.id) === preferredId ? 0 : 1));
    }
    for (const set of needsFetch) {
      if (typeof win.services?.SBC?.requestChallengesForSet !== 'function') break;
      await pace('move');
      log('Loading SBC challenges to match saved template', {
        setId: set.id,
        name: set.name || set._name || '',
      });
      const response = await awaitObservable(() =>
        win.services.SBC.requestChallengesForSet(set)
      );
      if (isSoftBanPayload(response)) return { softban: true };
      const challenge = challengeFromSet(set, choice.challengeId);
      if (challenge) {
        setTlFullSbcChoice({
          templateKey: choice.templateKey || String(choice.challengeId),
          challengeId: choice.challengeId,
          setId: Number(set.id) || null,
        });
        log('Found saved SBC challenge', {
          challengeId: choice.challengeId,
          setId: set.id,
          label: challengeLabel(set, challenge),
        });
        return { set, challenge };
      }
    }
    log('Saved SBC challenge was not found', { challengeId: choice.challengeId });
    return null;
  }

  function getGameNavigationController() {
    try {
      const root = win.getAppMain?.().getRootViewController?.();
      const presented = root?.getPresentedViewController?.();
      if (!presented) return null;
      if (win.UTNavigationController && presented instanceof win.UTNavigationController) {
        return presented;
      }
      if (win.UTTabBarController && presented instanceof win.UTTabBarController) {
        const current = presented.getCurrentViewController?.();
        if (win.UTNavigationController && current instanceof win.UTNavigationController) {
          return current;
        }
      }
    } catch (err) {
      log('Game navigation lookup failed', err);
    }
    return null;
  }

  async function waitNavIdle(nav, timeoutMs = 5000) {
    const start = Date.now();
    while (nav?.isTransitioning && Date.now() - start < timeoutMs) {
      await sleep(100);
    }
  }

  function activePopup() {
    const queue = win.gPopupClickShield?.queue;
    return Array.isArray(queue) ? queue[0] : null;
  }

  async function dismissSbcPopups() {
    const popup = activePopup();
    if (!popup) return false;
    const name = popup.constructor?.name || '';
    if (name === 'UTSBCConfirmSubmissionPopupViewController') {
      log('Confirming SBC submit popup');
      popup.eSubmitBtnTapped?.();
      await sleep(250);
      return true;
    }
    if (name === 'UTGameRewardsViewController') {
      log('Claiming SBC reward popup');
      if (typeof popup.onButtonTapped === 'function') popup.onButtonTapped();
      else win.gPopupClickShield?.closeActivePopup?.();
      await sleep(250);
      return true;
    }
    return false;
  }

  async function claimPendingSbcPopups() {
    for (let i = 0; i < 8; i++) {
      const acted = await dismissSbcPopups();
      if (!acted) await sleep(200);
    }
  }

  function squadClubItems(challenge) {
    const squad = challenge?.squad;
    if (!squad || typeof squad.getPlayers !== 'function') return [];
    const items = [];
    let slots = [];
    try {
      slots = squad.getPlayers() || [];
    } catch {
      slots = [];
    }
    for (const slot of slots) {
      let item = null;
      try {
        item = typeof slot?.getItem === 'function' ? slot.getItem() : slot?.item;
      } catch {
        item = null;
      }
      if (!item) continue;
      try {
        if (typeof item.isCarson === 'function' && item.isCarson()) continue;
      } catch {
        /* ignore */
      }
      if (itemResourceId(item)) items.push(item);
    }
    return items;
  }

  /**
   * Players the free-space SBC can actually submit. Transfer-list rows sometimes
   * omit isPlayer(), but kits, badges, and stadiums must not enter this set:
   * a squad that cannot contain them looks like a miss and the SBC stops.
   */
  function isTransferListPlayer(item) {
    if (!item || isManager(item)) return false;
    if (isPlayer(item)) return true;
    try {
      const type = getItemTypeValue(item);
      if (win.ItemType?.PLAYER != null && type === win.ItemType.PLAYER) return true;
    } catch {
      /* ignore */
    }
    if (classifyVanityKind(item)) return false;
    return getLeagueId(item) != null && definitionIdOf(item) != null;
  }

  function isUnlistedNonPlayerDuplicate(item) {
    return (
      !!item &&
      !isTransferListPlayer(item) &&
      isUnlistedOnTransferList(item) &&
      duplicateIdOf(item) > 0
    );
  }

  function unlistedDuplicateClubIds(items) {
    const ids = new Set();
    for (const item of items || []) {
      if (!isTransferListPlayer(item)) continue;
      if (!isUnlistedOnTransferList(item)) continue;
      const id = duplicateIdOf(item);
      if (id > 0) ids.add(id);
    }
    return ids;
  }

  function sbcScreenIsOpen(opened) {
    if (!opened?.nav) return false;
    let current = null;
    try {
      current = opened.nav.getCurrentViewController?.() || null;
    } catch {
      return false;
    }
    if (!current) return false;
    if (current === opened.screen || current === opened.detail) return true;
    return !!(
      win.UTSquadBuilderViewController &&
      current instanceof win.UTSquadBuilderViewController
    );
  }

  async function openSbcScreen(set, challenge) {
    await pace('move');
    const loaded = await awaitObservable(() => win.services.SBC.loadChallenge(challenge));
    if (isSoftBanPayload(loaded)) return { softban: true };
    if (!loaded?.success || !challenge.squad) {
      log('SBC challenge failed to open', {
        challengeId: challenge.id,
        success: !!loaded?.success,
      });
      return null;
    }
    const nav = getGameNavigationController();
    if (!nav) {
      log('SBC navigation controller unavailable');
      return null;
    }
    await waitNavIdle(nav);
    const phone = typeof win.isPhone === 'function' && win.isPhone();
    const Screen = phone
      ? win.UTSBCSquadOverviewViewController
      : win.UTSBCSquadSplitViewController;
    if (typeof Screen !== 'function') {
      log('SBC squad screen is unavailable');
      return null;
    }
    const returnTo = nav.getCurrentViewController?.() || null;
    const screen = new Screen();
    screen.initWithSBCSet(set, challenge.id);
    nav.pushViewController(screen, true);
    await waitNavIdle(nav);
    await sleep(350);

    let detail = null;
    if (phone) {
      if (typeof win.UTSBCSquadDetailPanelViewController !== 'function') {
        log('SBC detail screen is unavailable');
        return null;
      }
      detail = new win.UTSBCSquadDetailPanelViewController();
      detail.initWithSBCSet(set, challenge.id);
      nav.pushViewController(detail, true);
      await waitNavIdle(nav);
      await sleep(250);
    } else {
      detail = screen._challengeDetailsController?.getRootController?.() || null;
    }
    if (!detail || typeof detail._eUseTemplateSelected !== 'function') {
      log('Build Using Template command is unavailable');
      return { nav, screen, detail: null, set, challenge, returnTo, phone, missingCommand: true };
    }
    log('Opened SBC for template build', {
      challengeId: challenge.id,
      setId: set.id,
      phone,
    });
    return { nav, screen, detail, set, challenge, returnTo, phone };
  }

  async function waitForTemplateBuild(detail) {
    const nav = detail.getNavigationController?.();
    const Builder = win.UTSquadBuilderViewController;
    let sawBuilder = false;
    let stable = 0;
    const start = Date.now();
    while (Date.now() - start < 90000) {
      await sleep(400);
      let current = null;
      try {
        current = nav?.getCurrentViewController?.() || null;
      } catch {
        current = null;
      }
      const building = !!(Builder && current instanceof Builder);
      if (building) {
        sawBuilder = true;
        stable = 0;
        continue;
      }
      if (!sawBuilder) {
        if (Date.now() - start > 12000) {
          return { ok: false, reason: 'builder-did-not-start' };
        }
        continue;
      }
      stable += 1;
      if (stable >= 3) return { ok: true };
    }
    return { ok: false, reason: 'timeout' };
  }

  async function clearSbcSquad(detail, challenge) {
    try {
      const removed =
        challenge?.squad && typeof challenge.squad.removeAllItems === 'function'
          ? challenge.squad.removeAllItems()
          : false;
      if (!removed || typeof win.services?.SBC?.saveChallenge !== 'function') {
        log('SBC squad was not cleared', { removed: !!removed });
        return false;
      }
      await pace('move');
      const saved = await awaitObservable(() => win.services.SBC.saveChallenge(challenge));
      log('Cleared SBC squad that did not use transfer duplicates', {
        success: !!saved?.success,
      });
      return !!saved?.success;
    } catch (err) {
      warn('SBC squad clear failed', err);
      return false;
    }
  }

  async function submitOpenedSbc(controller) {
    const challenge =
      controller?._challenge ||
      controller?._set?.challenges?.get?.(controller?._challengeId) ||
      null;
    if (typeof challenge?.canSubmit !== 'function' || !challenge.canSubmit()) {
      log('SBC squad cannot be submitted');
      return { success: false, reason: 'cannot-submit' };
    }
    if (typeof controller._submitChallenge !== 'function') {
      log('SBC submit command is unavailable');
      return { success: false, reason: 'missing-submit' };
    }
    await pace('move');
    const original = controller._onChallengeSubmitted;
    const responses = [];
    controller._onChallengeSubmitted = function onCompanionSbcSubmitted(obs, resp) {
      responses.push(resp);
      try {
        if (typeof original === 'function') original.call(this, obs, resp);
      } catch (err) {
        warn('SBC submit callback failed', err);
      }
    };
    try {
      controller._submitChallenge();
      const start = Date.now();
      let failureSince = 0;
      while (Date.now() - start < 25000) {
        await dismissSbcPopups();
        const last = responses[responses.length - 1];
        if (last?.success) {
          await claimPendingSbcPopups();
          return { success: true, raw: last };
        }
        if (last && !last.success) {
          if (!failureSince) failureSince = Date.now();
          if (!activePopup() && Date.now() - failureSince > 2000) {
            return {
              success: false,
              raw: last,
              softban: isSoftBanPayload(last) || isSoftBanPayload(last.error),
            };
          }
        }
        await sleep(250);
      }
      return { success: false, reason: 'timeout', raw: responses[responses.length - 1] || null };
    } finally {
      controller._onChallengeSubmitted = original;
    }
  }

  async function returnFromSbc(opened) {
    if (!opened?.nav) return;
    await claimPendingSbcPopups();
    try {
      await waitNavIdle(opened.nav);
      const current = opened.nav.getCurrentViewController?.();
      if (opened.returnTo && current && current !== opened.returnTo) {
        opened.nav.popToViewController(opened.returnTo, false);
        await waitNavIdle(opened.nav);
      }
    } catch (err) {
      warn('Return from SBC failed', err);
    }
  }

  /**
   * Open the selected SBC, run Paletools Build Using Template, and submit.
   * One-click templates submit unlisted duplicate club copies directly.
   * Repeat while each submit removes unlisted transfer-list duplicates.
   * A miss does not stop Pack Opener. A soft-ban does.
   */
  function oneClickConflictIds(response) {
    const ids = new Set();
    for (const row of response?.data?.itemViolations || []) {
      for (const id of row?.itemIds || []) {
        const n = Number(id);
        if (n > 0) ids.add(n);
      }
    }
    return ids;
  }

  function oneClickSubmitLimit() {
    const configured = Number(
      win.services?.Configuration?.getFeatureSetting?.(
        win.UTServerSettingsRepository?.KEY?.ONE_CLICK_SBC_SUBMIT_LIMIT
      )
    );
    return configured > 0 ? configured : 30;
  }

  function pickOneClickFreeSpaceItems(pool, steps, importance, neededScore, limit) {
    const used = new Set();
    const chosen = [];
    let slots = limit;
    let needed = neededScore > 0 ? neededScore : null;
    for (const step of steps) {
      if (slots <= 0) break;
      if (needed != null && needed <= 0) break;
      const criteria = oneClickStepCriteria(step);
      let eligible = [];
      for (const item of pool) {
        const id = itemResourceId(item);
        if (id == null || used.has(id)) continue;
        if (!(Number(item.sbsScore) > 0)) continue;
        if (!isStandardOneClickItem(item)) continue;
        if (oneClickItemLocked(item)) continue;
        if (!itemMatchesSearchCriteria(item, criteria)) continue;
        if (!passesPaletoolsImportance(item, step, importance)) continue;
        eligible.push(item);
      }
      const lists = sbcListsForTemplateSettings(step);
      if (sbcListsActive(lists)) {
        const spareIds = new Set();
        if (step.ignoreImportanceTransfer) {
          for (const item of pool) {
            const defId = definitionIdOf(item);
            if (defId != null) spareIds.add(defId);
          }
        }
        eligible = holdUniqueSbcPlayers(eligible, spareIds, lists, {
          skipStorage: !!step.ignoreImportanceStorage,
        }).items;
      }
      eligible.sort(compareOneClickScore);
      const room = step.count === '' ? slots : Math.min(Number(step.count) || 0, slots);
      if (!(room > 0)) continue;
      const take =
        needed != null
          ? takeOneClickUntilRequirement(eligible, room, needed)
          : eligible.slice(0, room);
      for (const item of take) {
        const id = itemResourceId(item);
        if (id == null) continue;
        used.add(id);
        chosen.push(item);
        slots -= 1;
        if (needed != null) needed -= Number(item.sbsScore) || 0;
      }
    }
    return chosen;
  }

  async function loadOneClickDuplicatePool(challenge, duplicateIds) {
    const transfers = await fetchUnlistedTransferPlayers();
    const wanted = (transfers || []).filter((item) => duplicateIds.has(duplicateIdOf(item)));
    if (!wanted.length) return { items: [] };
    const copies = await resolveClubCopiesForTransferPlayers(wanted, {});
    const scored = await attachOneClickScores(challenge.id, copies);
    if (scored.softban) return { softban: true, items: [] };
    const tlByDef = new Map();
    for (const tl of wanted) {
      const def = definitionIdOf(tl);
      if (def != null && !tlByDef.has(def)) tlByDef.set(def, tl);
    }
    let withScore = 0;
    const items = [];
    for (const item of scored.items || []) {
      if (getItemRatingSafe(item) == null) {
        const rating = getItemRatingSafe(tlByDef.get(definitionIdOf(item)));
        if (rating) item.rating = rating;
      }
      if (Number(item.sbsScore) > 0) withScore += 1;
      items.push(item);
    }
    log('One-click free-space duplicates', {
      unlisted: wanted.length,
      copies: items.length,
      scored: withScore,
    });
    return { items };
  }

  function oneClickAwardCount(value) {
    return Array.isArray(value) ? value.length : 0;
  }

  function describeOneClickSubmit(response) {
    const data = response?.data;
    const challengeAwards = oneClickAwardCount(data?.grantedChallengeAwards);
    const setAwards = oneClickAwardCount(data?.grantedSetAwards);
    const reported = Number(data?.submittedScore);
    const codes = collectStatusCodes(response);
    const error = response?.error;
    const errorText =
      error && typeof error === 'object'
        ? String(error.message || error.code || error.name || '')
        : error != null
          ? String(error)
          : '';
    return {
      successFlag: response?.success === true,
      submittedScore: Number.isFinite(reported) ? reported : null,
      challengeAwards,
      setAwards,
      status: codes.length ? codes[0] : null,
      error: errorText.slice(0, 160),
    };
  }

  function oneClickChallengeState(challenge) {
    try {
      if (typeof challenge?.hasNotStarted === 'function' && challenge.hasNotStarted()) return 'NOT_STARTED';
      if (typeof challenge?.isInProgress === 'function' && challenge.isInProgress()) return 'IN_PROGRESS';
      if (typeof challenge?.isCompleted === 'function' && challenge.isCompleted()) return 'COMPLETED';
    } catch {
      /* ignore */
    }
    return challenge?.status ?? null;
  }

  async function initiateOneClickChallenge(challenge) {
    if (typeof win.services?.SBC?.initiateOneClickChallenge !== 'function') {
      return { success: false, reason: 'missing-initiate' };
    }
    await pace('move');
    let response = null;
    try {
      response = await awaitObservable(() => win.services.SBC.initiateOneClickChallenge(challenge));
    } catch (err) {
      if (isSoftBanPayload(err)) return { success: false, softban: true };
      warn('One-click challenge initiate failed', err);
      return { success: false, reason: 'error' };
    }
    if (isSoftBanPayload(response)) return { success: false, softban: true };
    const detail = describeOneClickSubmit(response);
    const inProgress = typeof challenge?.isInProgress === 'function' && challenge.isInProgress();
    log('One-click challenge initiate', {
      challengeId: challenge?.id,
      success: response?.success === true || inProgress,
      status: detail.status,
      error: detail.error,
      challengeStatus: oneClickChallengeState(challenge),
    });
    if (response?.success === true || inProgress) return { success: true, detail };
    return { success: false, detail };
  }

  async function requestOneClickSubmit(challenge, set, ids) {
    return awaitObservable(() => win.services.SBC.submitOneClickChallenge(challenge, set, ids));
  }

  async function submitOneClickPlayers(challenge, set, items) {
    const ids = items.map((item) => itemResourceId(item)).filter((id) => id != null);
    if (!ids.length || typeof win.services?.SBC?.submitOneClickChallenge !== 'function') {
      return { success: false, reason: 'missing-submit' };
    }
    if (typeof challenge?.hasNotStarted === 'function' && challenge.hasNotStarted()) {
      const started = await initiateOneClickChallenge(challenge);
      if (started.softban) return { success: false, softban: true };
      if (!started.success) {
        return { success: false, reason: 'not-started', detail: started.detail };
      }
    }
    const beforeScore = Number(challenge?.submittedScore) || 0;
    const postSubmit = async () => {
      await pace('move');
      try {
        return await requestOneClickSubmit(challenge, set, ids);
      } catch (err) {
        if (isSoftBanPayload(err)) return { softban: true, raw: err };
        warn('One-click free-space submit failed', err);
        return { failed: true };
      }
    };
    let response = await postSubmit();
    if (response?.softban) return { success: false, softban: true, raw: response.raw };
    if (response?.failed) return { success: false, reason: 'error' };
    if (isSoftBanPayload(response)) return { success: false, softban: true, raw: response };
    let detail = describeOneClickSubmit(response);
    if (!detail.successFlag && detail.status === 403) {
      const started = await initiateOneClickChallenge(challenge);
      if (started.softban) return { success: false, softban: true };
      if (started.success) {
        response = await postSubmit();
        if (response?.softban) return { success: false, softban: true, raw: response.raw };
        if (response?.failed) return { success: false, reason: 'error' };
        if (isSoftBanPayload(response)) return { success: false, softban: true, raw: response };
        detail = describeOneClickSubmit(response);
      }
    }
    detail.challengeStatus = oneClickChallengeState(challenge);
    const conflicts = oneClickConflictIds(response);
    const scoreChanged =
      detail.submittedScore != null && detail.submittedScore !== beforeScore;
    const awarded = detail.challengeAwards + detail.setAwards > 0;
    if (!detail.successFlag || (!scoreChanged && !awarded)) {
      return {
        success: false,
        reason: conflicts.size ? 'conflict' : detail.successFlag ? 'unconfirmed' : 'rejected',
        conflicts,
        detail,
        raw: response,
      };
    }
    return {
      success: true,
      completed: awarded,
      submittedScore: detail.submittedScore,
      detail,
      raw: response,
    };
  }

  async function solveTransferDuplicatesWithOneClick(found, duplicateIds) {
    const template = oneClickTemplateFor(found.challenge.id);
    if (!template.steps.length) {
      log('One-click free-space SBC has no template', { challengeId: found.challenge.id });
      return { submitted: 0, reason: 'no-template' };
    }
    const loaded = await loadOneClickDuplicatePool(found.challenge, duplicateIds);
    if (loaded.softban) return { submitted: 0, softban: true };
    let pool = loaded.items || [];
    const importance = readPaletoolsImportanceLists();
    const limit = oneClickSubmitLimit();
    let submitted = 0;
    const usedClubIds = new Set();
    const blocked = new Set();
    const finish = (extra = {}) => ({
      submitted,
      usedClubIds: [...usedClubIds],
      ...extra,
    });
    const maxRounds = Math.min(40, Math.max(duplicateIds.size, 1));
    for (let round = 0; round < maxRounds && duplicateIds.size && pool.length; round++) {
      const requirement = Number(found.challenge.scoreRequirement) || 0;
      const already = Number(found.challenge.submittedScore) || 0;
      const needed = requirement > 0 ? Math.max(0, requirement - already) : null;
      if (needed === 0) break;
      const available = pool.filter((item) => !blocked.has(itemResourceId(item)));
      const chosen = pickOneClickFreeSpaceItems(available, template.steps, importance, needed, limit);
      if (!chosen.length) {
        log('One-click free-space picked nothing', {
          pool: available.length,
          needed,
          steps: template.steps.map((step) => ({
            count: step.count === '' ? 'all' : step.count,
            minRating: step.minRating === '' ? null : step.minRating,
            maxRating: step.maxRating === '' ? null : step.maxRating,
          })),
        });
        break;
      }
      const score = chosen.reduce((sum, item) => sum + (Number(item.sbsScore) || 0), 0);
      notifyCompanion(
        `Companion: submitting one-click SBC (${chosen.length} players, ${duplicateIds.size} unlisted duplicates left)…`
      );
      const result = await submitOneClickPlayers(found.challenge, found.set, chosen);
      if (result.softban) return finish({ softban: true });
      if (!result.success && result.reason === 'conflict' && result.conflicts?.size) {
        for (const id of result.conflicts) blocked.add(id);
        log('One-click free-space skipped squad conflicts', { count: result.conflicts.size });
        continue;
      }
      if (!result.success) {
        log('One-click free-space submit did not succeed', {
          reason: result.reason || '',
          ...(result.detail || {}),
        });
        break;
      }
      submitted += 1;
      const chosenIds = new Set(chosen.map((item) => itemResourceId(item)));
      pool = pool.filter((item) => !chosenIds.has(itemResourceId(item)));
      rememberUsedClubItems(usedClubIds, chosen);
      refreshTransferListAfterClubCopiesUsed(chosen);
      let after = await fetchTransferPileItems();
      if (after.softban) return finish({ softban: true });
      let nextIds = unlistedDuplicateClubIds(after.items);
      if (nextIds.size >= duplicateIds.size) {
        await pace('move');
        after = await fetchTransferPileItems();
        if (after.softban) return finish({ softban: true });
        nextIds = unlistedDuplicateClubIds(after.items);
      }
      log('One-click free-space submit', {
        round: round + 1,
        players: chosen.length,
        available: available.length,
        score,
        completed: result.completed,
        submittedScore: result.submittedScore,
        challengeAwards: result.detail?.challengeAwards || 0,
        setAwards: result.detail?.setAwards || 0,
        scoreRequirement: requirement,
        duplicatesBefore: duplicateIds.size,
        duplicatesAfter: nextIds.size,
      });
      if (nextIds.size >= duplicateIds.size) break;
      duplicateIds = nextIds;
      pool = pool.filter((item) => duplicateIds.has(itemResourceId(item)));
      await claimPendingSbcPopups();
      if (result.completed && (Number(found.challenge.submittedScore) || 0) > 0) break;
    }
    log('One-click free-space finished', {
      submitted,
      remaining: duplicateIds.size,
      submittedScore: Number(found.challenge.submittedScore) || 0,
      scoreRequirement: Number(found.challenge.scoreRequirement) || 0,
    });
    return finish();
  }

  async function solveTransferDuplicatesWithSbc() {
    const choice = getTlFullSbcChoice();
    if (!choice) {
      log('No free-space SBC selected');
      return { submitted: 0, skipped: true };
    }
    const before = await fetchTransferPileItems();
    if (before.softban) return { submitted: 0, softban: true };
    let duplicateIds = unlistedDuplicateClubIds(before.items);
    const nonPlayerDuplicates = (before.items || []).filter(
      isUnlistedNonPlayerDuplicate
    ).length;
    log('Free-space SBC starting', {
      challengeId: choice.challengeId,
      unlistedPlayerDuplicates: duplicateIds.size,
      unlistedNonPlayerDuplicates: nonPlayerDuplicates,
    });
    if (!duplicateIds.size) return { submitted: 0, reason: 'no-duplicates' };

    const found = await findSbcChallenge(choice);
    if (found?.softban) return { submitted: 0, softban: true };
    if (!found?.challenge) return { submitted: 0, reason: 'not-found' };
    if (isOneClickChallenge(found.challenge)) {
      return solveTransferDuplicatesWithOneClick(found, duplicateIds);
    }

    let opened = null;
    let submitted = 0;
    const usedClubIds = new Set();
    const finish = (extra = {}) => ({
      submitted,
      usedClubIds: [...usedClubIds],
      ...extra,
    });
    try {
      const maxRounds = Math.min(40, duplicateIds.size);
      for (let round = 0; round < maxRounds && duplicateIds.size; round++) {
        const stillOpen =
          opened &&
          opened.detail &&
          sbcScreenIsOpen(opened);
        if (!stillOpen) {
          if (opened) await returnFromSbc(opened);
          opened = await openSbcScreen(found.set, found.challenge);
          if (opened?.softban) return finish({ softban: true });
          if (!opened?.detail) {
            log('Stopping free-space SBC', { reason: opened?.missingCommand ? 'missing-command' : 'open-failed' });
            break;
          }
        } else {
          await pace('move');
          const reloaded = await awaitObservable(() =>
            win.services.SBC.loadChallenge(found.challenge)
          );
          if (isSoftBanPayload(reloaded)) return finish({ softban: true });
          if (!reloaded?.success) {
            log('SBC reload failed', { round });
            break;
          }
        }

        notifyCompanion(
          `Companion: building SBC template (${duplicateIds.size} unlisted duplicates left)…`
        );
        try {
          opened.detail._eUseTemplateSelected();
        } catch (err) {
          warn('Build Using Template failed', err);
          break;
        }
        const built = await waitForTemplateBuild(opened.detail);
        const squadItems = squadClubItems(found.challenge);
        const matched = squadItems.filter((item) =>
          duplicateIds.has(itemResourceId(item))
        );
        log('SBC template build result', {
          round: round + 1,
          built: built.ok,
          reason: built.reason || '',
          squad: squadItems.length,
          matched: matched.length,
          canSubmit: !!found.challenge.canSubmit?.(),
        });
        if (!matched.length) {
          await clearSbcSquad(opened.detail, found.challenge);
          break;
        }
        const submittedResult = await submitOpenedSbc(opened.screen);
        if (submittedResult.softban) return finish({ softban: true });
        if (!submittedResult.success) {
          log('SBC submit did not succeed', {
            reason: submittedResult.reason || '',
          });
          if (submittedResult.reason === 'cannot-submit') {
            await clearSbcSquad(opened.detail, found.challenge);
          }
          break;
        }
        submitted += 1;
        rememberUsedClubItems(usedClubIds, squadItems);
        refreshTransferListAfterClubCopiesUsed(squadItems);
        let after = await fetchTransferPileItems();
        if (after.softban) return finish({ softban: true });
        let nextIds = unlistedDuplicateClubIds(after.items);
        if (nextIds.size >= duplicateIds.size) {
          await pace('move');
          after = await fetchTransferPileItems();
          if (after.softban) return finish({ softban: true });
          nextIds = unlistedDuplicateClubIds(after.items);
        }
        log('SBC submit updated unlisted duplicates', {
          before: duplicateIds.size,
          after: nextIds.size,
          submitted,
        });
        if (nextIds.size >= duplicateIds.size) break;
        duplicateIds = nextIds;
        await claimPendingSbcPopups();
      }
    } finally {
      await returnFromSbc(opened);
    }
    log('Free-space SBC finished', {
      submitted,
      remaining: duplicateIds.size,
      usedClubItems: usedClubIds.size,
    });
    return finish();
  }

  async function runTransferListCleanupBody() {
    const sbcChoice = getTlFullSbcChoice();
    notifyCompanion(
      sbcChoice
        ? 'Companion: transfer list full — clearing sold, submitting SBC, sending non-duplicates…'
        : 'Companion: transfer list full — clearing sold and sending non-duplicates…'
    );
    const before = await fetchTransferPileItems();
    if (before.softban) {
      state.tlFullCleanupGaveUp = true;
      requestPackOpenerSoftBanStop({ source: 'tl-full-refresh' });
      return 'softban';
    }
    const beforeCount = (before.items || []).length;

    const cleared = await clearSoldTransferItems();
    if (cleared.softban) {
      state.tlFullCleanupGaveUp = true;
      requestPackOpenerSoftBanStop({ source: 'tl-full-clear-sold', raw: cleared.raw });
      return 'softban';
    }

    let sbc = null;
    if (sbcChoice) {
      try {
        sbc = await solveTransferDuplicatesWithSbc();
        if (sbc?.softban) {
          state.tlFullCleanupGaveUp = true;
          requestPackOpenerSoftBanStop({ source: 'tl-full-sbc' });
          return 'softban';
        }
        log('Free-space SBC step finished', sbc);
      } catch (err) {
        warn('Free-space SBC failed; continuing to send non-duplicates', err);
      }
    }

    const sent = await sendNonDuplicateTransferItemsToClub(sbc?.usedClubIds);
    if (sent.softban) {
      state.tlFullCleanupGaveUp = true;
      requestPackOpenerSoftBanStop({ source: 'tl-full-send-club' });
      return 'softban';
    }

    const after = await fetchTransferPileItems();
    if (after.softban) {
      state.tlFullCleanupGaveUp = true;
      requestPackOpenerSoftBanStop({ source: 'tl-full-refresh-after' });
      return 'softban';
    }
    const afterCount = (after.items || []).length;
    const freed = Math.max(0, beforeCount - afterCount, sent.moved || 0);
    // isPileFull can stay stale after clear/move. The slot count, or a
    // successful club move, is the space that actually opened.
    const hasRoom = freed >= TL_FULL_MIN_FREED;
    log('Transfer-list free-space result', {
      beforeCount,
      afterCount,
      freed,
      minFreed: TL_FULL_MIN_FREED,
      hasRoom,
      pileReportsFull: repositoriesTransferFull(),
      cleared: cleared.success,
      clearMissing: !!cleared.missing,
      sbcChallengeId: sbcChoice?.challengeId || null,
      sentToClub: sent.moved,
      skipped: sent.skipped,
    });

    if (!hasRoom) {
      state.tlFullCleanupGaveUp = true;
      notifyCompanion(
        `Companion: freed ${freed} transfer-list slots — stopping. Pack Opener needs ${TL_FULL_MIN_FREED}.`
      );
      return 'none';
    }
    notifyCompanion(
      `Companion: freed ${freed} transfer-list slots. Continuing packs.`
    );
    return 'room';
  }

  /**
   * @returns {'quickSell'|'leave'|'ready'|'softban'}
   * ready = transfer list can take more items (cleanup may have just run).
   */
  async function prepareTransferListForIncoming({ force = false } = {}) {
    const action = getTransferListFullAction();
    if (action === 'quickSell') return 'quickSell';
    if (action !== TL_FULL_FREE_SPACE) return 'leave';
    if (!force && !repositoriesTransferFull()) return 'ready';
    const result = await freeTransferListSpace();
    if (result === 'softban') return 'softban';
    if (result === 'room') return 'ready';
    return 'leave';
  }

  function responseSucceeded(response) {
    if (response == null) return false;
    if (response.success === true) return true;
    if (response.success === false) return false;
    // Some EA notifications only expose a status code (0 = success)
    if (response.status === 0 || response.status === 'success') return true;
    if (typeof response.status === 'number' && response.status > 0) return false;
    // Ambiguous payload after observe — treat as success so we don't QS keeps
    return true;
  }

  /** EA / market soft-ban & captcha style status codes */
  const SOFT_BAN_STATUS_CODES = new Set([
    426, // Upgrade Required — verification / soft-ban (seen on /item QS)
    429, // rate limit / too many requests
    458, // fun captcha
    459, // captcha
    461, // permission denied
    494, // locked transfer market
    512, // search soft-ban (common)
    521, // request rejected
  ]);

  const SOFT_BAN_MESSAGE_RE =
    /too many requests|rate[\s_-]?limit|soft[\s_-]?ban|request rejected|permission denied|captcha|funcaptcha|upgrade required|transfer market not available|locked transfer market|error has occurred while trying to complete your search|complete your search|search failed|temporarily unavailable|try again later|unexpected end of json/i;

  function rememberUtasHttpStatus(url, status) {
    const code = Number(status);
    if (!Number.isFinite(code) || code <= 0) return;
    const href = String(url || '');
    // Use RegExp ctor — a `/` after `|` would terminate a regex literal early
    if (
      !new RegExp(
        'utas\\.|/ut/game/|transfermarket|/item/',
        'i'
      ).test(href)
    ) {
      return;
    }
    state.recentUtasStatuses.push({
      status: code,
      url: href.slice(0, 180),
      at: Date.now(),
    });
    if (state.recentUtasStatuses.length > 12) {
      state.recentUtasStatuses.shift();
    }
    if (SOFT_BAN_STATUS_CODES.has(code)) {
      log('UTAS soft-ban HTTP status', { status: code, url: href.slice(0, 180) });
      if (state.clubScanRunning) {
        requestClubScanSoftBanStop({
          source: 'xhr',
          status: code,
          url: href.slice(0, 180),
        });
      }
    }
  }

  function recentSoftBanHttpStatus(maxAgeMs = 15000) {
    const now = Date.now();
    for (let i = state.recentUtasStatuses.length - 1; i >= 0; i--) {
      const entry = state.recentUtasStatuses[i];
      if (now - entry.at > maxAgeMs) break;
      if (SOFT_BAN_STATUS_CODES.has(entry.status)) return entry;
    }
    return null;
  }

  /** Capture real HTTP statuses — EA observe payloads often omit 426/429/etc. */
  function installUtasXhrStatusHook() {
    if (state.xhrStatusHookInstalled) return;
    const XHR = win.XMLHttpRequest;
    if (!XHR?.prototype) return;
    state.xhrStatusHookInstalled = true;

    const open = XHR.prototype.open;
    const send = XHR.prototype.send;
    XHR.prototype.open = function (method, url, ...rest) {
      try {
        this.__companionUtasUrl = url;
      } catch {
        /* ignore */
      }
      return open.call(this, method, url, ...rest);
    };
    XHR.prototype.send = function (...args) {
      try {
        this.addEventListener('loadend', function () {
          try {
            rememberUtasHttpStatus(
              this.__companionUtasUrl || this.responseURL,
              this.status
            );
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
      return send.apply(this, args);
    };
    log('UTAS XHR status hook installed');
  }

  // Install ASAP so club-scan QS 426s are visible
  try {
    installUtasXhrStatusHook();
  } catch {
    /* ignore */
  }

  function collectStatusCodes(value, out = [], depth = 0) {
    if (value == null || depth > 4) return out;
    if (typeof value === 'number' && Number.isFinite(value)) {
      out.push(value);
      return out;
    }
    if (typeof value !== 'object') return out;
    for (const key of [
      'status',
      'statusCode',
      'httpStatus',
      'code',
      'errorCode',
      'error',
      'statuscode',
    ]) {
      const n = Number(value[key]);
      if (Number.isFinite(n)) out.push(n);
    }
    if (value.response && typeof value.response === 'object') {
      collectStatusCodes(value.response, out, depth + 1);
    }
    if (value.data && typeof value.data === 'object') {
      collectStatusCodes(value.data, out, depth + 1);
    }
    return out;
  }

  function softBanMessageText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message || String(value);
    const parts = [];
    for (const key of [
      'message',
      'error',
      'statusText',
      'reason',
      'detail',
      'title',
      'description',
    ]) {
      const v = value[key];
      if (typeof v === 'string') parts.push(v);
      else if (typeof v === 'number') parts.push(String(v));
    }
    try {
      parts.push(JSON.stringify(value));
    } catch {
      /* ignore */
    }
    return parts.join(' ');
  }

  /**
   * True when a dig/API result looks like an EA soft-ban / captcha / rate-limit.
   * Paletools find-lowest emits the string 'ERROR' when the market search throws.
   * Also checks recent UTAS XHR statuses (426 etc. often missing from observe payload).
   */
  function isSoftBanSignal(value) {
    if (value === 'ERROR') return true;
    const recent = recentSoftBanHttpStatus();
    if (recent) return true;
    if (value == null) return false;
    const codes = collectStatusCodes(value);
    if (codes.some((c) => SOFT_BAN_STATUS_CODES.has(c))) return true;
    const text = softBanMessageText(value);
    if (text && SOFT_BAN_MESSAGE_RE.test(text)) return true;
    return false;
  }

  function requestClubScanSoftBanStop(info) {
    if (state.clubScanStats?.softBanned && state.clubScanStopRequested) {
      return; // already stopping
    }
    state.clubScanStopRequested = true;
    if (state.clubScanStats) {
      state.clubScanStats.stopped = true;
      state.clubScanStats.softBanned = true;
      const code = info?.status || recentSoftBanHttpStatus()?.status;
      state.clubScanStats.lastReason = code
        ? `soft-ban / rate-limit (HTTP ${code}) — scan stopped`
        : 'soft-ban / rate-limit detected — scan stopped';
    }
    log('Club scan stopped: likely soft-ban', info);
    try {
      win.services?.Notification?.queue?.([
        'Companion club scan stopped: market soft-ban / rate-limit detected. Wait before retrying.',
        win.UINotificationType?.NEGATIVE ??
          win.UINotificationType?.NEUTRAL ??
          0,
      ]);
    } catch {
      /* ignore */
    }
    updateClubScanPanel();
  }

  async function moveToTransfer(items) {
    const services = win.services;
    const ItemPile = win.ItemPile;
    if (!services?.Item?.move || !ItemPile || !items.length) {
      return { success: false };
    }
    try {
      await pace('move');
      const response = await toPromise(
        services.Item.move(items, ItemPile.TRANSFER)
      );
      const success = responseSucceeded(response);
      if (!success) {
        await paceRateLimitBackoff('move-failed');
      }
      return {
        raw: response,
        success,
      };
    } catch (err) {
      log('moveToTransfer failed', err);
      await paceRateLimitBackoff('move-error');
      return { success: false, error: err };
    }
  }

  async function moveToClub(items) {
    const services = win.services;
    const ItemPile = win.ItemPile;
    if (!services?.Item?.move || !ItemPile || !items.length) {
      return { success: false };
    }
    try {
      await pace('move');
      const response = await toPromise(
        services.Item.move(items, ItemPile.CLUB)
      );
      const success = responseSucceeded(response);
      if (!success) {
        await paceRateLimitBackoff('move-club-failed');
      }
      return { raw: response, success };
    } catch (err) {
      log('moveToClub failed', err);
      await paceRateLimitBackoff('move-club-error');
      return { success: false, error: err };
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => win.setTimeout(resolve, ms));
  }

  function randomBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /** Ensure a randomized gap since the last paced EA action. */
  async function pace(kind) {
    const range = PACE[kind] || PACE.move;
    const targetGap = randomBetween(range.min, range.max);
    const elapsed = Date.now() - (state.lastPacedActionAt || 0);
    const wait = Math.max(0, targetGap - elapsed);
    if (wait > 0) {
      log('Pacing before action', { kind, waitMs: wait });
      await sleep(wait);
    }
    state.lastPacedActionAt = Date.now();
  }

  async function paceRateLimitBackoff(reason) {
    const wait = randomBetween(
      PACE.rateLimitBackoff.min,
      PACE.rateLimitBackoff.max
    );
    log('Rate-limit backoff', { reason, waitMs: wait });
    await sleep(wait);
    state.lastPacedActionAt = Date.now();
  }

  function getPriceIncrement(price) {
    if (price < 1000) return 50;
    if (price < 10000) return 100;
    if (price < 50000) return 250;
    if (price < 100000) return 500;
    return 1000;
  }

  function snapBuyNow(price, minimum = 200) {
    const n = Number(price);
    if (!n || Number.isNaN(n)) return minimum;
    const inc = getPriceIncrement(n);
    return Math.max(Math.round(n / inc) * inc, minimum);
  }

  /** Next valid market price above `price` (List-TM Buy-Now floor when start is at min). */
  function stepAbove(price) {
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return 200;
    return n + getPriceIncrement(n);
  }

  function stepBelow(price) {
    const n = Number(price);
    if (!n || Number.isNaN(n)) return 150;
    if (n <= 1000) return Math.max(n - 50, 150);
    if (n <= 10000) return n - 100;
    if (n <= 50000) return n - 250;
    if (n <= 100000) return n - 500;
    return n - 1000;
  }

  // Paletools find-lowest canRun filter (not UTItemActionPanelView)
  const FIND_LOWEST_PANEL_CTORS = [
    'UTDefaultActionPanelView',
    'UTSlotActionPanelView',
    'UTAuctionActionPanelView',
  ];

  function rememberPaletoolsFindLowest(fn, source) {
    if (typeof fn !== 'function') return false;
    if (state.paletoolsFindLowestFn !== fn) {
      state.paletoolsFindLowestFn = fn;
      log('Captured Paletools find-lowest digger', source || '');
    }
    return true;
  }

  function readFindLowestFrom(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const fn = obj._onFindLowestPrice || obj.__companionOnFindLowestPrice;
    return typeof fn === 'function' ? fn : null;
  }

  /**
   * Capture Paletools' `_onFindLowestPrice` (hotkey V digger).
   * That method closes over Paletools' real find-lowest implementation.
   * Pack Opener never builds item action panels, so we also wrap generate and
   * can force-run generate() once to obtain the digger without pressing V.
   */
  function installPaletoolsFindLowestCapture() {
    for (const name of FIND_LOWEST_PANEL_CTORS) {
      const Ctor = win[name];
      if (!Ctor?.prototype) continue;

      if (!Ctor.prototype.__companionFindLowestCapture) {
        try {
          Object.defineProperty(Ctor.prototype, '_onFindLowestPrice', {
            configurable: true,
            enumerable: false,
            get() {
              return this.__companionOnFindLowestPrice;
            },
            set(fn) {
              this.__companionOnFindLowestPrice = fn;
              rememberPaletoolsFindLowest(fn, name + '#setter');
            },
          });
          Ctor.prototype.__companionFindLowestCapture = true;
        } catch (err) {
          log('Could not install find-lowest setter on', name, err);
        }
      }

      if (
        typeof Ctor.prototype.generate === 'function' &&
        !Ctor.prototype.__companionFindLowestGenerateWrap
      ) {
        const desc = Object.getOwnPropertyDescriptor(
          Ctor.prototype,
          'generate'
        );
        const originalGenerate = desc?.value || Ctor.prototype.generate;
        if (typeof originalGenerate !== 'function') continue;

        const wrapped = function companionFindLowestGenerateWrap(...args) {
          let result;
          try {
            result = originalGenerate.apply(this, args);
          } finally {
            rememberPaletoolsFindLowest(
              readFindLowestFrom(this),
              name + '#generate'
            );
          }
          return result;
        };

        try {
          Object.defineProperty(Ctor.prototype, 'generate', {
            configurable: true,
            enumerable: desc ? !!desc.enumerable : false,
            writable: true,
            value: wrapped,
          });
          Ctor.prototype.__companionFindLowestGenerateWrap = true;
        } catch (err) {
          try {
            Ctor.prototype.generate = wrapped;
            Ctor.prototype.__companionFindLowestGenerateWrap = true;
          } catch (err2) {
            log('Could not wrap generate on', name, err2);
          }
        }
      }
    }
  }

  /** Scan DOM / app tree for an already-built panel that has find-lowest. */
  function scanForPaletoolsFindLowest() {
    if (typeof state.paletoolsFindLowestFn === 'function') return true;

    try {
      const nodes =
        win.document?.querySelectorAll?.(
          '.find-lowest-price, [paletools-element="find-lowest-price"]'
        ) || [];
      for (const el of nodes) {
        let cur = el;
        for (let depth = 0; depth < 16 && cur; depth++) {
          if (rememberPaletoolsFindLowest(readFindLowestFrom(cur), 'dom')) {
            return true;
          }
          try {
            for (const key of Object.keys(cur)) {
              const val = cur[key];
              if (
                val &&
                typeof val === 'object' &&
                rememberPaletoolsFindLowest(readFindLowestFrom(val), 'dom-key')
              ) {
                return true;
              }
            }
          } catch {
            /* ignore */
          }
          cur = cur.parentElement;
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const root =
        typeof win.getAppMain === 'function' ? win.getAppMain() : null;
      if (!root) return false;
      const seen = new Set();
      const queue = [root];
      let steps = 0;
      while (queue.length && steps < 5000) {
        const obj = queue.shift();
        steps++;
        if (!obj || typeof obj !== 'object' || seen.has(obj)) continue;
        if (obj instanceof win.Element || obj instanceof win.Node) continue;
        seen.add(obj);
        if (rememberPaletoolsFindLowest(readFindLowestFrom(obj), 'app-scan')) {
          return true;
        }
        for (const key of [
          '_views',
          '_view',
          'view',
          'views',
          '_children',
          'children',
          '_controller',
          'controller',
          '__rootViewController',
          '_rootController',
          '_presentedViewController',
          '_currentController',
        ]) {
          try {
            const val = obj[key];
            if (!val) continue;
            if (Array.isArray(val)) {
              for (const entry of val) queue.push(entry);
            } else if (typeof val === 'object') {
              queue.push(val);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }

    return typeof state.paletoolsFindLowestFn === 'function';
  }

  /**
   * Pack Opener never opens an item action panel, so force Paletools' generate
   * inject once. That assigns `_onFindLowestPrice`, which we capture.
   */
  function forceCapturePaletoolsFindLowest() {
    installPaletoolsFindLowestCapture();
    if (typeof state.paletoolsFindLowestFn === 'function') return true;
    if (scanForPaletoolsFindLowest()) return true;

    for (const name of FIND_LOWEST_PANEL_CTORS) {
      const Ctor = win[name];
      if (typeof Ctor !== 'function') continue;
      let panel = null;
      try {
        try {
          panel = new Ctor();
        } catch {
          panel = Object.create(Ctor.prototype);
        }
        try {
          panel.init?.();
        } catch {
          /* ignore */
        }
        try {
          panel.generate?.();
        } catch {
          /* ignore */
        }
        if (
          rememberPaletoolsFindLowest(
            readFindLowestFrom(panel),
            name + '#force'
          )
        ) {
          try {
            panel.dealloc?.();
          } catch {
            /* ignore */
          }
          return true;
        }
        try {
          panel.dealloc?.();
        } catch {
          /* ignore */
        }
      } catch (err) {
        log('Force find-lowest capture failed for', name, err);
      }
    }

    if (typeof state.paletoolsFindLowestFn !== 'function') {
      log('Paletools find-lowest still not captured', {
        ctors: FIND_LOWEST_PANEL_CTORS.filter(
          (n) => typeof win[n] === 'function'
        ),
      });
    }
    return typeof state.paletoolsFindLowestFn === 'function';
  }

  function pricesFromPaletoolsFindLowestDetail(detail) {
    if (detail == null || detail === 'ERROR') return [];
    if (typeof detail === 'string') return []; // Extinct / localized extinct
    const buckets = Array.isArray(detail) ? detail : [detail];
    const prices = [];
    for (const bucket of buckets) {
      const value = Number(bucket?.value);
      const count = Number(bucket?.count) || 0;
      if (!Number.isFinite(value) || value <= 0 || count <= 0) continue;
      for (let i = 0; i < count; i++) prices.push(value);
    }
    return prices;
  }

  /**
   * Pick list BIN from find-lowest price samples using minUndercuts:
   * - 0: always the current lowest BIN
   * - N>=1: lowest BIN that has at least N listings strictly cheaper than it
   *   (falls back to the highest sampled BIN if the market is too thin)
   */
  function computeUndercutSafeBuyNow(
    prices,
    minUndercuts = getMinUndercuts(),
    minimumBin = 200
  ) {
    const valid = (prices || []).map(Number).filter((p) => p > 0);
    if (!valid.length) return null;

    const counts = new Map();
    for (const price of valid) {
      counts.set(price, (counts.get(price) || 0) + 1);
    }
    const sorted = [...counts.keys()].sort((a, b) => a - b);
    const lowest = sorted[0];
    const need = Math.max(0, Number(minUndercuts) || 0);
    const floor = Number.isFinite(minimumBin) && minimumBin > 0 ? minimumBin : 200;

    if (need <= 0) {
      return snapBuyNow(lowest, floor);
    }

    let below = 0;
    for (const price of sorted) {
      if (below >= need) {
        return snapBuyNow(price, floor);
      }
      below += counts.get(price) || 0;
    }
    return snapBuyNow(sorted[sorted.length - 1], floor);
  }

  /**
   * Run Paletools find-lowest (same path as hotkey V) for an item.
   * Listens for findLowestPriceAction:searchend which carries the dig result.
   * Digs are serialized — Paletools' handler has an internal re-entrancy lock.
   */
  async function digWithPaletoolsFindLowest(item) {
    const run = () => digWithPaletoolsFindLowestUnlocked(item);
    const queued = state.paletoolsDigChain.then(run, run);
    // Keep the chain alive after failures so later digs still run
    state.paletoolsDigChain = queued.catch(() => {});
    return queued;
  }

  async function digWithPaletoolsFindLowestUnlocked(item) {
    if (!forceCapturePaletoolsFindLowest()) {
      throw new Error(
        'Paletools find-lowest unavailable — enable Find Lowest Price in Paletools settings, then retry'
      );
    }
    const fn = state.paletoolsFindLowestFn;

    const detail = await new Promise((resolve, reject) => {
      let settled = false;
      const timer = win.setTimeout(() => {
        cleanup();
        reject(new Error('Paletools find-lowest timed out'));
      }, 90000);

      function cleanup() {
        if (settled) return;
        settled = true;
        win.clearTimeout(timer);
        win.removeEventListener(
          'findLowestPriceAction:searchend',
          onSearchEnd
        );
      }

      function onSearchEnd(event) {
        cleanup();
        resolve(event?.detail);
      }

      win.addEventListener('findLowestPriceAction:searchend', onSearchEnd);

      // Paletools reads this._currentItem.definitionId / .type inside the digger
      const fakePanel = { _currentItem: item };
      Promise.resolve(fn.call(fakePanel))
        .then(async () => {
          if (settled) return;
          // searchend is normally dispatched before this async fn resolves.
          // Wait briefly for a late event; if still nothing, dig was skipped
          // (re-entrancy lock) or produced no event.
          await sleep(400);
          if (!settled) {
            cleanup();
            resolve(null);
          }
        })
        .catch((err) => {
          if (!settled) {
            cleanup();
            reject(err);
          }
        });
    });

    // Let Paletools finish unlock / UI listeners before the next dig
    await sleep(300);
    return detail;
  }

  function bucketsFromFindLowestDetail(detail) {
    if (detail == null || detail === 'ERROR') return [];
    // Paletools may emit a localized "not found" string
    if (typeof detail === 'string') {
      // Rare: parse "200 x6" / "200x6" style from UI text if we ever get it
      const m = detail.match(/(\d[\d,]*)\s*x\s*(\d+)/i);
      if (m) {
        const value = Number(String(m[1]).replace(/,/g, ''));
        const count = Number(m[2]);
        if (value > 0 && count > 0) return [{ value, count }];
      }
      return [];
    }
    const raw = Array.isArray(detail) ? detail : [detail];
    const counts = new Map();
    for (const bucket of raw) {
      if (bucket == null) continue;
      const value = Number(
        bucket.value ?? bucket.price ?? bucket.buyNow ?? bucket.bin
      );
      const count = Number(
        bucket.count ?? bucket.amount ?? bucket.qty ?? bucket.quantity
      );
      if (!Number.isFinite(value) || value <= 0) continue;
      const n = Number.isFinite(count) && count > 0 ? count : 1;
      counts.set(value, (counts.get(value) || 0) + n);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value - b.value);
  }

  /**
   * Worthless club vanity: lowest BIN is at the Buy-Now minimum AND more than
   * `threshold` listings sit on that floor. Thin floors, above-min, and empty
   * markets are kept (empty can mean max-BIN / no current sellers).
   */
  function evaluateClubItemLiquidity(detail, minBuyNow, threshold) {
    const buckets = bucketsFromFindLowestDetail(detail);
    if (!buckets.length) {
      return {
        quickSell: false,
        reason: 'no-market',
        lowest: null,
        atMin: 0,
        minBuyNow,
      };
    }
    const lowest = buckets[0].value;
    const lowestCount = buckets[0].count;
    const atMin = buckets
      .filter((b) => b.value <= minBuyNow)
      .reduce((sum, b) => sum + b.count, 0);
    if (lowest > minBuyNow) {
      return {
        quickSell: false,
        reason: 'above-min',
        lowest,
        atMin,
        lowestCount,
        minBuyNow,
      };
    }
    // Flooded floor: either summed at-min listings or the cheapest bucket alone
    if (atMin > threshold || lowestCount > threshold) {
      return {
        quickSell: true,
        reason: 'floor-flooded',
        lowest,
        atMin: Math.max(atMin, lowestCount),
        lowestCount,
        minBuyNow,
      };
    }
    return {
      quickSell: false,
      reason: 'thin-floor',
      lowest,
      atMin,
      lowestCount,
      minBuyNow,
    };
  }

  function isTradeableItem(item) {
    if (!item) return false;
    try {
      if (typeof item.isTradeable === 'function') return !!item.isTradeable();
    } catch {
      /* ignore */
    }
    if (item.untradeable || item._untradeable || item.tradeable === false) {
      return false;
    }
    return true;
  }

  function isClubCosmeticsItem(item) {
    if (!item || isPlayer(item) || isManager(item)) return false;
    return looksLikeUtItem(item);
  }

  function looksLikeUtItem(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const defId = obj.definitionId ?? obj._meta?.id;
    if (defId == null || defId === '') return false;
    return (
      typeof obj.isPlayer === 'function' ||
      typeof obj.isManager === 'function' ||
      typeof obj.getAuctionData === 'function' ||
      obj.type != null ||
      obj._type != null ||
      obj.rareflag != null ||
      obj._rareflag != null
    );
  }

  /** Any club vanity item we should evaluate (tradeable or not). */
  function isClubScanCandidate(item) {
    return isClubCosmeticsItem(item);
  }

  function canDiscardClubItem(item) {
    if (!item) return false;
    try {
      if (typeof item.getDiscardValue === 'function') {
        const v = Number(item.getDiscardValue());
        // Some untradeables still discard for coins; only block when EA says 0.
        if (Number.isFinite(v) && v < 0) return false;
      }
    } catch {
      /* ignore */
    }
    return true;
  }

  function getPresentedViewControllers() {
    const out = [];
    const seen = new Set();
    const walk = (ctrl, depth) => {
      if (!ctrl || typeof ctrl !== 'object' || seen.has(ctrl) || depth > 10) {
        return;
      }
      seen.add(ctrl);
      out.push(ctrl);
      try {
        const kids =
          ctrl.getChildViewControllers?.() ||
          ctrl.childViewControllers ||
          ctrl._childViewControllers ||
          [];
        if (Array.isArray(kids)) {
          for (const kid of kids) walk(kid, depth + 1);
        }
      } catch {
        /* ignore */
      }
      try {
        const cur = ctrl.getCurrentViewController?.();
        if (cur) walk(cur, depth + 1);
      } catch {
        /* ignore */
      }
      try {
        const nested = ctrl.getPresentedViewController?.();
        if (nested) walk(nested, depth + 1);
      } catch {
        /* ignore */
      }
    };

    try {
      const app = typeof win.getAppMain === 'function' ? win.getAppMain() : null;
      const root = app?.getRootViewController?.();
      walk(root?.getPresentedViewController?.() || root, 0);
    } catch {
      /* ignore */
    }
    return out;
  }

  function scoreClubItemArray(arr) {
    if (!Array.isArray(arr) || arr.length < 1 || arr.length > 2500) return -1;
    let vanity = 0;
    let players = 0;
    const sample = arr.slice(0, Math.min(arr.length, 50));
    for (const item of sample) {
      if (!looksLikeUtItem(item)) return -1;
      if (isPlayer(item) || isManager(item)) players++;
      else vanity++;
    }
    if (vanity === 0 || players > vanity) return -1;
    return vanity * 100 + Math.min(arr.length, 500);
  }

  function collectArraysFromObject(obj, arrays, seen, budget) {
    if (!obj || typeof obj !== 'object' || seen.has(obj) || seen.size > budget) {
      return;
    }
    if (obj instanceof win.Element || obj instanceof win.Node) return;
    seen.add(obj);
    if (Array.isArray(obj)) {
      if (scoreClubItemArray(obj) > 0) arrays.push(obj);
      return;
    }
    for (const key of [
      'collection',
      '_collection',
      'items',
      '_items',
      'listItems',
      '_listItems',
      'searchResults',
      '_searchResults',
      'viewmodel',
      'viewModel',
      '_viewmodel',
      '_viewModel',
      'view',
      '_view',
      'model',
      '_model',
      'dataSource',
      '_dataSource',
    ]) {
      try {
        const val = obj[key];
        if (val && typeof val === 'object') {
          collectArraysFromObject(val, arrays, seen, budget);
        }
      } catch {
        /* ignore */
      }
    }
  }

  function clubItemKey(item) {
    if (!item) return '';
    if (item.id != null) return `id:${item.id}`;
    return `def:${item.definitionId}:${item.type ?? ''}`;
  }

  /** Active Club/Stadium search-results controller (has clubViewModel paging). */
  function findClubSearchResultsController() {
    for (const ctrl of getPresentedViewControllers()) {
      const vm = ctrl?.clubViewModel;
      if (
        vm &&
        typeof vm.getPageItems === 'function' &&
        typeof vm.setIndex === 'function'
      ) {
        return ctrl;
      }
    }
    return null;
  }

  function getClubViewPageIndex(ctrl) {
    const vm = ctrl?.clubViewModel;
    if (!vm) return 0;
    try {
      if (typeof vm.getIndex === 'function') {
        const n = Number(vm.getIndex());
        if (Number.isFinite(n) && n >= 0) return n;
      }
    } catch {
      /* ignore */
    }
    const n = Number(vm._index ?? vm.index ?? 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function getClubViewPageSize(ctrl) {
    const vm = ctrl?.clubViewModel;
    const n = Number(
      vm?.numItemsPerPage ?? vm?._numItemsPerPage ?? vm?.itemsPerPage ?? 20
    );
    return Number.isFinite(n) && n > 0 ? n : 20;
  }

  function getClubViewRootElement(ctrl) {
    try {
      const view =
        typeof ctrl?.getView === 'function' ? ctrl.getView() : ctrl?._view;
      const el =
        (typeof view?.getRootElement === 'function' &&
          view.getRootElement()) ||
        view?.__root ||
        view?._rootElement ||
        null;
      if (el) return el;
    } catch {
      /* ignore */
    }
    return (
      win.document.querySelector(
        '.ut-club-search-results-view, .album-view.ut-club-search-results-view'
      ) || win.document
    );
  }

  /**
   * Items on the *visible* club page (list rows). Prefer this over the full
   * viewmodel collection so paging stays aligned with what the UI shows.
   */
  function getClubViewPageItems(ctrl) {
    if (ctrl) {
      try {
        const view =
          typeof ctrl.getView === 'function' ? ctrl.getView() : ctrl._view;
        const list =
          view?._list ||
          view?.list ||
          (typeof view?.getList === 'function' ? view.getList() : null);
        const rows = list?.listRows || list?._listRows || view?.listRows || [];
        if (rows.length) {
          const fromRows = [];
          const seen = new Set();
          for (const row of rows) {
            const data = row?.data || row?._data;
            if (!isClubScanCandidate(data)) continue;
            const key = clubItemKey(data);
            if (seen.has(key)) continue;
            seen.add(key);
            fromRows.push(data);
          }
          if (fromRows.length) return fromRows;
        }
      } catch {
        /* fall through to viewmodel page */
      }

      const vm = ctrl.clubViewModel;
      if (vm && typeof vm.getPageItems === 'function') {
        try {
          return (vm.getPageItems() || []).filter(isClubScanCandidate);
        } catch {
          /* ignore */
        }
      }
    }
    return [];
  }

  function refreshClubViewPage(ctrl) {
    if (!ctrl?.clubViewModel) return;
    try {
      const page = ctrl.clubViewModel.getPageItems?.() || [];
      if (typeof ctrl.updateItemList === 'function') {
        ctrl.updateItemList(page, true);
      }
    } catch (err) {
      log('refreshClubViewPage failed', err);
    }
  }

  function isPaginationControlEnabled(el) {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.getAttribute?.('aria-disabled') === 'true') return false;
    if (el.classList?.contains('disabled')) return false;
    if (el.classList?.contains('btn-disabled')) return false;
    return true;
  }

  function clickDomElement(el) {
    if (!el || typeof el.click !== 'function') return false;
    try {
      el.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      );
      el.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, cancelable: true })
      );
      el.click();
      return true;
    } catch {
      try {
        el.click();
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Select the item in the club list UI so the detail panel matches the dig.
   * Prefer row click (updates EA selection + detail); fall back to list APIs.
   */
  function selectClubItemInView(ctrl, item) {
    if (!ctrl || !item) return false;
    try {
      const view = typeof ctrl.getView === 'function' ? ctrl.getView() : ctrl._view;
      const list =
        view?._list ||
        view?.list ||
        (typeof view?.getList === 'function' ? view.getList() : null);
      const rows = list?.listRows || list?._listRows || view?.listRows || [];
      let idx = -1;
      for (let i = 0; i < rows.length; i++) {
        const data = rows[i]?.data || rows[i]?._data;
        if (!data) continue;
        if (item.id != null && data.id === item.id) {
          idx = i;
          break;
        }
        if (
          item.definitionId != null &&
          data.definitionId === item.definitionId &&
          (data.type == null || item.type == null || data.type === item.type)
        ) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return false;

      const row = rows[idx];
      if (typeof list?.setIndex === 'function') {
        try {
          list.setIndex(idx);
        } catch {
          /* ignore */
        }
      }
      if (typeof view?.selectListIndex === 'function') {
        try {
          view.selectListIndex(idx);
        } catch {
          /* ignore */
        }
      }
      if (typeof ctrl.selectListIndex === 'function') {
        try {
          ctrl.selectListIndex(idx);
        } catch {
          /* ignore */
        }
      }

      const el =
        (typeof row.getRootElement === 'function' && row.getRootElement()) ||
        row.__root ||
        row._rootElement ||
        row.rootElement;
      if (el && typeof el.click === 'function') {
        el.click();
      } else if (typeof row.select === 'function') {
        row.select();
      }

      try {
        if ('_currentItem' in ctrl) ctrl._currentItem = item;
      } catch {
        /* ignore */
      }
      return true;
    } catch (err) {
      log('selectClubItemInView failed', err);
      return false;
    }
  }

  /**
   * Click EA club list next-page control.
   * Real selector (from Paletools hotkeys): `.pagingContainer > button.pagination.next`
   */
  function clickClubPaginationNext(ctrl) {
    const root = getClubViewRootElement(ctrl);
    const selectors = [
      '.pagingContainer > button.pagination.next',
      '.pagingContainer button.pagination.next',
      'button.pagination.next',
      '.paginated-item-list .pagingContainer button.next',
      '.pagingContainer .btn-next',
    ];
    for (const sel of selectors) {
      try {
        const el = root.querySelector?.(sel) || win.document.querySelector(sel);
        if (isPaginationControlEnabled(el) && clickDomElement(el)) {
          log('Club pagination clicked', sel);
          return true;
        }
      } catch {
        /* ignore */
      }
    }
    try {
      const candidates = [
        ...(root.querySelectorAll?.(
          '.pagingContainer button, .paginated-item-list button'
        ) || []),
      ];
      for (const el of candidates) {
        const cls = String(el.className || '').toLowerCase();
        if (!cls.includes('next') && !cls.includes('pagination')) continue;
        if (!cls.includes('next')) continue;
        if (!isPaginationControlEnabled(el)) continue;
        if (clickDomElement(el)) {
          log('Club pagination clicked (fallback)', cls);
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  function pageItemsKey(items) {
    return (items || []).map(clubItemKey).join('|');
  }

  /**
   * Advance club list to the next page. Returns true if the page contents changed.
   */
  async function advanceClubViewPage(ctrl) {
    const beforeItems = ctrl
      ? getClubViewPageItems(ctrl)
      : collectCurrentClubViewItems().filter(isClubScanCandidate);
    const beforeKeys = pageItemsKey(beforeItems);
    const beforeIdx = getClubViewPageIndex(ctrl);
    const pageSize = Math.max(
      getClubViewPageSize(ctrl),
      beforeItems.length || 0,
      20
    );
    const vm = ctrl?.clubViewModel;

    const attempts = [];

    attempts.push({
      name: 'dom-next',
      run: () => clickClubPaginationNext(ctrl),
      revert: null,
    });

    if (vm && typeof vm.setIndex === 'function') {
      // EA clubViewModel index is usually the page number (0-based)
      attempts.push({
        name: 'vm-page+1',
        run: () => {
          vm.setIndex(beforeIdx + 1);
          refreshClubViewPage(ctrl);
          return true;
        },
        revert: () => {
          vm.setIndex(beforeIdx);
          refreshClubViewPage(ctrl);
        },
      });
      // Some builds treat index as an item offset into the collection
      attempts.push({
        name: `vm-offset+${pageSize}`,
        run: () => {
          vm.setIndex(beforeIdx + pageSize);
          refreshClubViewPage(ctrl);
          return true;
        },
        revert: () => {
          vm.setIndex(beforeIdx);
          refreshClubViewPage(ctrl);
        },
      });
    }

    for (const attempt of attempts) {
      let ran = false;
      try {
        ran = !!attempt.run();
      } catch (err) {
        log('Club page advance attempt failed', {
          name: attempt.name,
          err,
        });
      }
      if (!ran) continue;

      await sleep(1000);

      const afterItems = ctrl
        ? getClubViewPageItems(ctrl)
        : collectCurrentClubViewItems().filter(isClubScanCandidate);
      const afterKeys = pageItemsKey(afterItems);
      const afterIdx = getClubViewPageIndex(ctrl);

      if (afterItems.length && afterKeys !== beforeKeys) {
        log('Club scan advanced page', {
          method: attempt.name,
          from: beforeIdx,
          to: afterIdx,
          beforeCount: beforeItems.length,
          afterCount: afterItems.length,
        });
        return true;
      }

      try {
        attempt.revert?.();
      } catch {
        /* ignore */
      }
      log('Club page advance had no effect', {
        name: attempt.name,
        beforeIdx,
        afterIdx,
      });
    }

    return false;
  }

  /** Best-effort: items currently loaded in the Club/Stadium list the user filtered. */
  function collectCurrentClubViewItems() {
    const ctrl = findClubSearchResultsController();
    if (ctrl) {
      // Prefer the full viewmodel collection when available so the scan button
      // count reflects more than the current page; fall back to page items.
      const vm = ctrl.clubViewModel;
      const arrays = [];
      const seen = new Set();
      collectArraysFromObject(vm, arrays, seen, 4000);
      collectArraysFromObject(ctrl, arrays, seen, 4000);

      let best = null;
      let bestScore = -1;
      for (const arr of arrays) {
        const score = scoreClubItemArray(arr);
        if (score > bestScore) {
          bestScore = score;
          best = arr;
        }
      }
      if (best?.length) {
        const unique = [];
        const seenItems = new Set();
        for (const item of best) {
          if (!isClubCosmeticsItem(item)) continue;
          const key = clubItemKey(item);
          if (seenItems.has(key)) continue;
          seenItems.add(key);
          unique.push(item);
        }
        if (unique.length) return unique;
      }
      return getClubViewPageItems(ctrl);
    }

    const arrays = [];
    const seen = new Set();
    for (const c of getPresentedViewControllers()) {
      collectArraysFromObject(c, arrays, seen, 6000);
    }

    let best = null;
    let bestScore = -1;
    for (const arr of arrays) {
      const score = scoreClubItemArray(arr);
      if (score > bestScore) {
        bestScore = score;
        best = arr;
      }
    }

    if (!best?.length) return [];

    const unique = [];
    const seenItems = new Set();
    for (const item of best) {
      if (!isClubCosmeticsItem(item)) continue;
      const key = clubItemKey(item);
      if (seenItems.has(key)) continue;
      seenItems.add(key);
      unique.push(item);
    }
    return unique;
  }

  async function quickSellClubItems(items) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return { success: false, count: 0 };
    const services = win.services;
    // Prefer stored original discard; service hook is also safe for vanity items
    const fn =
      typeof state.originalDiscard === 'function'
        ? state.originalDiscard
        : services?.Item?.discard?.bind(services.Item);
    if (typeof fn !== 'function') {
      log('Item.discard unavailable for club QS');
      return { success: false, count: 0 };
    }
    try {
      await pace('discard');
      const response = await toPromise(fn(list));
      const success = responseSucceeded(response);
      // Observe payloads often omit HTTP 426. During club scan, any QS failure
      // is treated as soft-ban risk (continuing extends the lock).
      const softBan =
        !success &&
        (state.clubScanRunning ||
          isSoftBanSignal(response) ||
          !!recentSoftBanHttpStatus());
      if (!success && !softBan) await paceRateLimitBackoff('club-qs-failed');
      return { success, softBan, count: list.length, raw: response };
    } catch (err) {
      log('Club quick sell failed', err);
      const softBan =
        state.clubScanRunning ||
        isSoftBanSignal(err) ||
        !!recentSoftBanHttpStatus();
      if (!softBan) await paceRateLimitBackoff('club-qs-error');
      return { success: false, softBan, count: 0, error: err };
    }
  }

  function emptyClubScanStats() {
    return {
      total: 0,
      index: 0,
      page: 1,
      quickSold: 0,
      kept: 0,
      skipped: 0,
      errors: 0,
      currentName: '',
      lastReason: '',
      stopped: false,
      softBanned: false,
    };
  }

  function updateClubScanPanel() {
    const panel = win.document.getElementById('companion-club-scan-panel');
    if (!panel) return;
    const s = state.clubScanStats || emptyClubScanStats();
    const threshold = getClubFloorListingsToQs();
    const running = state.clubScanRunning;
    const progressLabel =
      s.total > 0 ? `${s.index} / ${s.total}` : `${s.index}`;
    panel.style.display = running || s.index > 0 || s.total > 0 ? '' : 'none';
    panel.innerHTML = `
      <div style="font-weight:700;color:#4ee6eb;margin-bottom:6px;">Club value scan</div>
      <div style="margin-bottom:6px;">
        ${
          running
            ? 'Scanning…'
            : s.softBanned
              ? 'Stopped (soft-ban)'
              : s.stopped
                ? 'Stopped'
                : s.index
                  ? 'Finished'
                  : 'Idle'
        }
        · floor QS if &gt;${threshold} at min BIN
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        <span>Progress</span><b>${progressLabel}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        <span>Page</span><b>${s.page || 1}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        <span>Quick sold</span><b>${s.quickSold}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        <span>Kept</span><b>${s.kept}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        <span>Skipped</span><b>${s.skipped}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        <span>Errors</span><b>${s.errors}</b>
      </div>
      <div style="margin-top:8px;opacity:0.85;font-size:11px;word-break:break-word;">
        ${escapeHtml(s.currentName || '—')}
        ${s.lastReason ? `<div style="margin-top:2px;">${escapeHtml(s.lastReason)}</div>` : ''}
      </div>
      ${
        running
          ? `<button type="button" id="companion-club-scan-stop" style="margin-top:10px;width:100%;padding:8px;border:none;border-radius:4px;background:#c23b22;color:#fff;cursor:pointer;">Stop scan</button>`
          : `<button type="button" id="companion-club-scan-close" style="margin-top:10px;width:100%;padding:8px;border:none;border-radius:4px;background:#3a4555;color:#fff;cursor:pointer;">Close</button>`
      }
    `;
    panel
      .querySelector('#companion-club-scan-stop')
      ?.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        state.clubScanStopRequested = true;
        updateClubScanPanel();
      });
    panel
      .querySelector('#companion-club-scan-close')
      ?.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        state.clubScanStats = null;
        panel.style.display = 'none';
      });
  }

  function ensureClubScanPanel() {
    let panel = win.document.getElementById('companion-club-scan-panel');
    if (!panel) {
      panel = win.document.createElement('div');
      panel.id = 'companion-club-scan-panel';
      panel.style.cssText = [
        'position:fixed',
        'left:12px',
        'top:72px',
        'z-index:99999',
        'width:min(280px,calc(100vw - 24px))',
        'max-height:min(50vh,420px)',
        'overflow:auto',
        'padding:12px',
        'border:1px solid rgba(78,230,235,0.45)',
        'border-radius:4px',
        'background:rgba(15,20,28,0.92)',
        'color:#f3f3f3',
        'font:12px/1.35 sans-serif',
        'box-shadow:0 2px 12px rgba(0,0,0,0.4)',
        'display:none',
      ].join(';');
      (win.document.body || win.document.documentElement).appendChild(panel);
    }
    return panel;
  }

  function ensureClubScanButton() {
    let btn = win.document.getElementById('companion-club-scan-btn');
    if (!btn) {
      btn = win.document.createElement('button');
      btn.id = 'companion-club-scan-btn';
      btn.type = 'button';
      btn.textContent = 'Scan club list value';
      btn.title =
        'Clear Club/Stadium list junk: quick-sell untradeables and items with a flooded min-BIN floor. Keep only tradeables with real sale value.';
      btn.style.cssText = [
        'position:fixed',
        'left:12px',
        'bottom:12px',
        'z-index:99999',
        'padding:8px 10px',
        'border:none',
        'border-radius:4px',
        'background:#0e7c6b',
        'color:#fff',
        'font:12px/1.2 sans-serif',
        'cursor:pointer',
        'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
        'display:none',
      ].join(';');
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (state.clubScanRunning) {
          state.clubScanStopRequested = true;
          return;
        }
        startClubValueScan();
      });
      (win.document.body || win.document.documentElement).appendChild(btn);
    }

    const items = collectCurrentClubViewItems().filter(isClubScanCandidate);
    const show =
      !state.packOpenerRunning &&
      (state.clubScanRunning || items.length > 0);
    btn.style.display = show ? '' : 'none';
    if (state.clubScanRunning) {
      btn.textContent = 'Stop club scan';
      btn.style.background = '#c23b22';
    } else {
      btn.textContent =
        items.length > 0
          ? `Scan club list (${items.length})`
          : 'Scan club list value';
      btn.style.background = '#0e7c6b';
    }
    return btn;
  }

  /**
   * Dig / QS / keep one club item. Returns 'stop' if the run should halt.
   */
  async function processClubScanItem(item, threshold) {
    state.clubScanStats.index += 1;
    state.clubScanStats.currentName = getItemDisplayName(item);
    state.clubScanStats.lastReason = 'starting…';
    updateClubScanPanel();
    log('Club scan next item', {
      index: state.clubScanStats.index,
      page: state.clubScanStats.page,
      definitionId: item?.definitionId,
      name: state.clubScanStats.currentName,
    });

    let shouldQs = false;
    let reason = '';

    if (!isTradeableItem(item)) {
      shouldQs = true;
      reason = 'untradeable';
    } else {
      state.clubScanStats.lastReason = 'digging…';
      updateClubScanPanel();

      const minBuyNow = getMinBuyNowPrice(item);
      try {
        await pace('clubScan');
        if (state.clubScanStopRequested) return 'stop';
        const detail = await digWithPaletoolsFindLowest(item);
        // Paletools emits 'ERROR' when the market search throws (soft-ban / captcha)
        if (isSoftBanSignal(detail)) {
          requestClubScanSoftBanStop({
            source: 'dig',
            definitionId: item.definitionId,
            detail,
          });
          return 'softban';
        }
        const verdict = evaluateClubItemLiquidity(
          detail,
          minBuyNow,
          threshold
        );
        shouldQs = verdict.quickSell === true;
        reason = `${verdict.reason} · lowest ${
          verdict.lowest ?? '—'
        } x${verdict.lowestCount ?? verdict.atMin ?? 0} · atMin ${
          verdict.atMin
        } · minBIN ${minBuyNow}`;
        log('Club scan dig detail', {
          definitionId: item.definitionId,
          minBuyNow,
          eaStartMin: getMinStartPrice(item),
          threshold,
          detail,
          buckets: bucketsFromFindLowestDetail(detail),
          verdict,
        });
      } catch (err) {
        if (
          isSoftBanSignal(err) ||
          /timed out/i.test(String(err?.message || err || ''))
        ) {
          requestClubScanSoftBanStop({
            source: 'dig-error',
            definitionId: item.definitionId,
            err,
          });
          return 'softban';
        }
        shouldQs = false;
        reason = `dig-failed · kept (${err?.message || err})`;
        state.clubScanStats.errors++;
        log('Club scan dig failed; keeping item', {
          definitionId: item.definitionId,
          err,
        });
      }
    }

    state.clubScanStats.lastReason = reason;
    log('Club scan item', {
      name: state.clubScanStats.currentName,
      definitionId: item.definitionId,
      type: item.type,
      tradeable: isTradeableItem(item),
      shouldQs,
      reason,
    });

    if (shouldQs) {
      if (!canDiscardClubItem(item)) {
        state.clubScanStats.skipped++;
        state.clubScanStats.lastReason += ' → cannot discard';
        return 'kept';
      }
      const sold = await quickSellClubItems([item]);
      if (sold.softBan || state.clubScanStopRequested) {
        const recent = recentSoftBanHttpStatus();
        requestClubScanSoftBanStop({
          source: 'quick-sell',
          definitionId: item.definitionId,
          status: recent?.status,
          raw: sold.raw,
          error: sold.error,
        });
        return 'softban';
      }
      if (sold.success) {
        state.clubScanStats.quickSold++;
        state.clubScanStats.lastReason += ' → quick sold';
        updateClubScanPanel();
        return 'sold';
      }
      state.clubScanStats.errors++;
      state.clubScanStats.lastReason += ' → QS failed';
      updateClubScanPanel();
      return 'kept';
    }

    state.clubScanStats.kept++;
    state.clubScanStats.lastReason += ' → kept';
    updateClubScanPanel();
    return 'kept';
  }

  async function startClubValueScan() {
    if (state.clubScanRunning) return;
    if (state.packOpenerRunning) {
      log('Club scan blocked — Pack Opener is running');
      return;
    }

    installServiceHooks();
    installUtasXhrStatusHook();
    installPaletoolsFindLowestCapture();
    forceCapturePaletoolsFindLowest();

    let ctrl = findClubSearchResultsController();
    const preview = collectCurrentClubViewItems().filter(isClubScanCandidate);
    if (!preview.length && !getClubViewPageItems(ctrl).length) {
      log('Club scan: no vanity items in current view', {
        hasController: !!ctrl,
      });
      try {
        win.services?.Notification?.queue?.([
          'Companion: no club/stadium items found in the current list — open a filtered Stadium list first',
          win.UINotificationType?.NEUTRAL ?? 0,
        ]);
      } catch {
        /* ignore */
      }
      ensureClubScanButton();
      return;
    }

    const threshold = getClubFloorListingsToQs();
    state.clubScanRunning = true;
    state.clubScanStopRequested = false;
    state.clubScanStats = emptyClubScanStats();
    // Estimate only — live paging + QS means the real total can grow/shrink
    state.clubScanStats.total = preview.length;
    state.clubScanStats.page = getClubViewPageIndex(ctrl) + 1;
    ensureClubScanPanel();
    ensureClubScanButton();
    updateClubScanPanel();
    log('Club value scan started', {
      estimatedCount: preview.length,
      threshold,
      hasController: !!ctrl,
      pageSize: ctrl ? getClubViewPageSize(ctrl) : null,
    });

    const processed = new Set();
    const MAX_STEPS = 5000;

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        if (state.clubScanStopRequested) {
          state.clubScanStats.stopped = true;
          break;
        }

        ctrl = findClubSearchResultsController() || ctrl;
        state.clubScanStats.page = getClubViewPageIndex(ctrl) + 1;

        let pageItems = ctrl
          ? getClubViewPageItems(ctrl)
          : collectCurrentClubViewItems().filter(isClubScanCandidate);
        let next = pageItems.find((it) => !processed.has(clubItemKey(it)));

        if (!next) {
          // Entire current page already decided (typically 20 kept) — next page
          if (ctrl && pageItems.length) {
            state.clubScanStats.lastReason =
              'page full of kept items · advancing…';
            updateClubScanPanel();
            const moved = await advanceClubViewPage(ctrl);
            if (moved) continue;
          }
          log('Club scan: no more unprocessed items on this page');
          break;
        }

        try {
          selectClubItemInView(ctrl, next);
          await sleep(250);

          const key = clubItemKey(next);
          const outcome = await processClubScanItem(next, threshold);
          processed.add(key);

          if (outcome === 'stop' || outcome === 'softban') {
            state.clubScanStats.stopped = true;
            break;
          }

          if (outcome === 'sold') {
            // Let the club list refill the slot from remaining items
            await sleep(900);
            try {
              refreshClubViewPage(ctrl);
            } catch {
              /* ignore */
            }
          }

          state.clubScanStats.lastReason += ' · next…';
          updateClubScanPanel();
          await sleep(800);
        } catch (itemErr) {
          processed.add(clubItemKey(next));
          if (isSoftBanSignal(itemErr)) {
            requestClubScanSoftBanStop({ source: 'item-loop', err: itemErr });
            break;
          }
          state.clubScanStats.errors++;
          state.clubScanStats.lastReason = `item error: ${
            itemErr?.message || itemErr
          }`;
          log('Club scan item iteration error — continuing', itemErr);
          updateClubScanPanel();
          await sleep(800);
        }
      }
    } finally {
      state.clubScanRunning = false;
      state.clubScanStopRequested = false;
      ensureClubScanButton();
      updateClubScanPanel();
      const s = state.clubScanStats;
      log('Club value scan finished', s);
      if (!s?.softBanned) {
        try {
          win.services?.Notification?.queue?.([
            `Companion club scan: QS ${s.quickSold}, kept ${s.kept}, skipped/errors ${
              s.skipped + s.errors
            }`,
            win.UINotificationType?.NEUTRAL ?? 0,
          ]);
        } catch {
          /* ignore */
        }
      }
    }
  }

  async function listItemOnMarket(item, buyNowPrice) {
    const services = win.services;
    if (!services?.Item?.list) {
      log('services.Item.list unavailable');
      return { success: false };
    }
    const minBin = getMinBuyNowPrice(item);
    const minStart = getMinStartPrice(item);
    const buyNow = snapBuyNow(buyNowPrice, minBin);
    const bid = snapBuyNow(stepBelow(buyNow), minStart);
    try {
      await pace('list');
      const response = await toPromise(
        services.Item.list(item, bid, buyNow, LIST_DURATION_SECONDS)
      );
      const success = responseSucceeded(response);
      if (!success) {
        await paceRateLimitBackoff('list-failed');
      }
      return { success, buyNow, bid, raw: response };
    } catch (err) {
      log('listItemOnMarket failed', err);
      await paceRateLimitBackoff('list-error');
      return { success: false, error: err, buyNow, bid };
    }
  }

  function requestPackOpenerSoftBanStop(info) {
    if (!state.packOpenerRunning) return;
    if (!state.packOpenerSoftBanned) {
      state.packOpenerSoftBanned = true;
      log('Pack Opener Dig+list soft-ban — stopping after this pack', info || {});
      try {
        win.services?.Notification?.queue?.([
          'Companion: market soft-ban / rate-limit detected — stopping after this pack',
          win.UINotificationType?.NEUTRAL ?? 0,
        ]);
      } catch {
        /* ignore */
      }
    }
    requestEarlyStop();
  }

  async function priceAndListItem(item) {
    const definitionId = item.definitionId ?? item._meta?.id;
    if (!definitionId) {
      log('Missing definitionId; will move to transfer list unlisted', item);
      return { success: false, reason: 'no-definition' };
    }

    const minStart = getMinStartPrice(item);
    const minBuyNow = getMinBuyNowPrice(item);

    await pace('betweenPlayers');
    let detail;
    try {
      detail = await digWithPaletoolsFindLowest(item);
    } catch (err) {
      if (isSoftBanSignal(err) || recentSoftBanHttpStatus()) {
        requestPackOpenerSoftBanStop({
          source: 'dig-error',
          definitionId,
          err,
        });
        return { success: false, reason: 'softban', error: err };
      }
      log('Paletools find-lowest dig failed', err);
      return { success: false, reason: 'find-lowest-failed', error: err };
    }
    if (isSoftBanSignal(detail) || recentSoftBanHttpStatus()) {
      requestPackOpenerSoftBanStop({
        source: 'dig',
        definitionId,
        detail,
      });
      return { success: false, reason: 'softban' };
    }
    const minUndercuts = getMinUndercuts();
    const prices = pricesFromPaletoolsFindLowestDetail(detail);
    const buyNow = computeUndercutSafeBuyNow(prices, minUndercuts, minBuyNow);
    log('Item pricing', {
      kind: isManager(item) ? 'manager' : 'player',
      definitionId,
      nationId: isManager(item) ? getNationId(item) : undefined,
      leagueId: isPlayer(item) ? getLeagueId(item) : undefined,
      samples: prices.length,
      minUndercuts,
      buyNow,
      minStart,
      minBuyNow,
      findLowestDetail: detail,
    });

    if (!buyNow) {
      log('No market price (extinct?) — will move to transfer list unlisted');
      return { success: false, reason: 'no-price' };
    }

    let listed = await listItemOnMarket(item, buyNow);
    if (!listed.success) {
      if (isSoftBanSignal(listed.raw) || recentSoftBanHttpStatus()) {
        requestPackOpenerSoftBanStop({
          source: 'list',
          definitionId,
          raw: listed.raw,
        });
        // Still fall back to TL unlisted for this item; early-stop halts further packs
      }
      // Some piles require transfer first before listing
      const moved = await moveToTransfer([item]);
      if (moved.success) {
        listed = await listItemOnMarket(item, buyNow);
        if (listed.success) return listed;
        if (isSoftBanSignal(listed.raw) || recentSoftBanHttpStatus()) {
          requestPackOpenerSoftBanStop({
            source: 'list-retry',
            definitionId,
            raw: listed.raw,
          });
        }
        // Already on TL unlisted; do not move again
        return { success: false, reason: 'list-failed', alreadyOnTransfer: true };
      }
    }
    return listed;
  }

  /**
   * After a soft-ban during Dig+list, skip further market digs in this discard batch.
   */
  function shouldSkipFurtherListing() {
    return !!(state.packOpenerRunning && state.packOpenerSoftBanned);
  }

  function rememberPackClubPlayers(items) {
    if (!items?.length) return;
    if (!state.packClubPlayers) state.packClubPlayers = [];
    for (const item of items) {
      if (!isPlayer(item) || itemIsOnTransfer(item)) continue;
      if (state.packClubPlayers.some((kept) => samePackItem(kept, item))) continue;
      state.packClubPlayers.push(item);
    }
  }

  /**
   * Paletools handles duplicate players in a later pass and can move cards we
   * already sent to the club onto the transfer list. Drop those from To Club.
   */
  function forgetPackClubPlayers(items) {
    if (!items?.length || !state.packClubPlayers?.length) return;
    const drop = items.filter(Boolean);
    const before = state.packClubPlayers.length;
    state.packClubPlayers = state.packClubPlayers.filter(
      (kept) => !drop.some((item) => samePackItem(kept, item))
    );
    if (state.packClubPlayers.length === before) return;

    const packState = findPackOpenerState();
    if (!packState || !Array.isArray(packState.clubItems)) return;
    let removedPlayers = 0;
    packState.clubItems = packState.clubItems.filter((kept) => {
      const hit = drop.some((item) => samePackItem(kept, item));
      if (hit && isPlayer(kept)) removedPlayers++;
      return !hit;
    });
    if (removedPlayers && typeof packState.playersToClub === 'number') {
      packState.playersToClub = Math.max(0, packState.playersToClub - removedPlayers);
    }
  }

  function creditPackOpenerClubItems(movedItems) {
    if (!movedItems?.length) return false;
    const packState = findPackOpenerState();
    if (!packState) return false;

    const movedSet = new Set(movedItems);
    if (Array.isArray(packState.discardedItems)) {
      packState.discardedItems = packState.discardedItems.filter(
        (item) => !movedSet.has(item)
      );
    }
    if (Array.isArray(packState.clubItems)) {
      for (const item of movedItems) {
        if (!packState.clubItems.includes(item)) {
          packState.clubItems.push(item);
        }
      }
    }
    let players = 0;
    let managers = 0;
    let others = 0;
    for (const item of movedItems) {
      if (isPlayer(item)) players++;
      else if (isManager(item)) managers++;
      else others++;
    }
    if (players && typeof packState.playersToClub === 'number') {
      packState.playersToClub += players;
    }
    if (managers && typeof packState.managersToClub === 'number') {
      packState.managersToClub += managers;
    }
    if (others && typeof packState.itemsToClub === 'number') {
      packState.itemsToClub += others;
    }
    log('Credited Pack Opener state for club moves', {
      players,
      managers,
      others,
    });
    return true;
  }

  async function applyTransferListFullFallback(item, toDiscard) {
    const prep = await prepareTransferListForIncoming();
    if (prep === 'quickSell') {
      toDiscard.push(item);
      return 'quickSell';
    }
    // stopProcess / free-space with no room / soft-ban: leave unassigned
    return prep === 'ready' ? 'ready' : 'leave';
  }

  /**
   * Dig+list one item; on failure fall back to transfer-list unlisted (never silent QS).
   */
  async function disposeListItem(item, meta, buckets) {
    const { toDiscard, unlistedTransferItems, transferred } = buckets;
    if (shouldSkipFurtherListing()) {
      log('Skipping Dig+list after soft-ban — transfer unlisted', meta);
      unlistedTransferItems.push(item);
      return;
    }
    if (repositoriesTransferFull()) {
      log('Transfer list full; applying TL-full action for Dig+list', {
        ...meta,
        tlFullAction: getTransferListFullAction(),
      });
      const outcome = await applyTransferListFullFallback(item, toDiscard);
      if (outcome !== 'ready') return;
    }
    const result = await priceAndListItem(item);
    if (result?.success) {
      log('LISTED via pack rules', { ...meta, buyNow: result.buyNow });
      rememberListed(item, { buyNow: result.buyNow, bid: result.bid });
      return;
    }
    if (result?.alreadyOnTransfer) {
      log('Listing failed after TL move — leaving unlisted', meta);
      transferred.push(item);
      return;
    }
    log('Listing failed — moving to transfer list unlisted', {
      ...meta,
      reason: result?.reason,
    });
    unlistedTransferItems.push(item);
  }

  /**
   * Pack Opener disposition router driven by companion packRules matrix.
   * Native category selects are forced to quickSell so Paletools always hits discard.
   */
  async function handlePackRulesDiscard(items, originalDiscard) {
    const rules = getPackRules();
    const toClub = [];
    const toDiscard = [];
    const unlistedTransferItems = [];
    const transferred = [];
    const listTargets = [];

    for (const item of items) {
      const classification = classifyPackItem(item);
      const action = resolvePackRuleForClassification(classification, rules);
      const meta = {
        kind: classification.kind,
        duplicate: classification.duplicate,
        important: classification.important,
        action,
        name: getItemDisplayName(item),
        nationId: classification.kind === 'manager' ? getNationId(item) : undefined,
        leagueId: classification.kind === 'player' ? getLeagueId(item) : undefined,
        type: getItemTypeValue(item),
      };
      log('Pack rule disposition', meta);

      if (action === PACK_ACTION.CLUB) {
        toClub.push(item);
      } else if (action === PACK_ACTION.QUICK_SELL) {
        toDiscard.push(item);
      } else if (action === PACK_ACTION.TRANSFER) {
        unlistedTransferItems.push(item);
      } else if (action === PACK_ACTION.LIST) {
        listTargets.push({ item, meta });
      } else {
        toDiscard.push(item);
      }
    }

    for (const { item, meta } of listTargets) {
      await disposeListItem(item, meta, {
        toDiscard,
        unlistedTransferItems,
        transferred,
      });
    }

    if (toClub.length) {
      const moved = await moveToClub(toClub);
      log('Moved items to club via pack rules', {
        count: toClub.length,
        success: moved.success,
      });
      if (moved.success) {
        creditPackOpenerClubItems(toClub);
        rememberPackClubPlayers(toClub);
      } else {
        log('Club move failed; leaving unassigned', { count: toClub.length });
      }
    }

    if (unlistedTransferItems.length) {
      let pendingTransfer = unlistedTransferItems;
      if (transferListNeedsRoom(pendingTransfer.length)) {
        log(
          'Transfer list full for unlisted items; applying TL-full action',
          {
            count: pendingTransfer.length,
            pileCount: transferPileCount(),
            tlFullAction: getTransferListFullAction(),
          }
        );
        const prep = await prepareTransferListForIncoming({ force: true });
        if (prep === 'quickSell') {
          toDiscard.push(...pendingTransfer);
          pendingTransfer = [];
        } else if (prep !== 'ready') {
          // Stop: leave these unassigned. Do not quick-sell them.
          pendingTransfer = [];
        }
      }
      if (pendingTransfer.length) {
        let moved = await moveToTransfer(pendingTransfer);
        let stuck = itemsStillUnassigned(pendingTransfer);
        const softBan =
          isSoftBanPayload(moved.raw) || isSoftBanPayload(moved.error);
        if (
          stuck.length &&
          !softBan &&
          getTransferListFullAction() === TL_FULL_FREE_SPACE
        ) {
          log('Transfer move left items unassigned; freeing space and retrying', {
            count: stuck.length,
            names: stuck.slice(0, 8).map((item) => getItemDisplayName(item)),
            pileCount: transferPileCount(),
            reportedSuccess: moved.success,
          });
          const prep = await prepareTransferListForIncoming({ force: true });
          if (prep === 'ready') {
            moved = await moveToTransfer(stuck);
            stuck = itemsStillUnassigned(stuck);
          }
        }
        const stuckSet = new Set(stuck);
        const landed = pendingTransfer.filter((item) => !stuckSet.has(item));
        if (landed.length || stuck.length) {
          log('Moved items to transfer list unlisted via pack rules', {
            count: landed.length,
            leftUnassigned: stuck.length,
            success: landed.length > 0 && stuck.length === 0,
          });
        }
        if (landed.length) transferred.push(...landed);
        if (stuck.length) {
          if (softBan) {
            requestPackOpenerSoftBanStop({ source: 'tl-move', raw: moved.raw });
          } else if (getTransferListFullAction() === 'quickSell') {
            toDiscard.push(...stuck);
          } else if (getTransferListFullAction() === TL_FULL_FREE_SPACE) {
            state.tlFullCleanupGaveUp = true;
          }
        }
      }
    }

    if (transferred.length) {
      rememberTransferred(transferred);
      creditPackOpenerState(transferred);
    }

    // Critical: Paletools keeps this array ref and after await does
    //   discardCount += items.length; addItems('discarded', items)
    replaceArrayContents(items, toDiscard);

    if (!items.length) {
      if (state.packOpenerRunning) updateLivePackSummaryPanel();
      return { success: true };
    }

    // originalDiscard bypasses companionDiscard — tally QS here for the summary
    if (state.packOpenerRunning) noteDisposition(items, 'discarded');

    await pace('discard');
    const result = await toPromise(
      originalDiscard.call(win.services.Item, items)
    );
    if (state.packOpenerRunning) updateLivePackSummaryPanel();
    return result;
  }

  /** @deprecated use handlePackRulesDiscard */
  async function handleSplitDiscard(items, originalDiscard) {
    return handlePackRulesDiscard(items, originalDiscard);
  }

  function isPackOpenerState(obj) {
    return !!(
      obj &&
      typeof obj === 'object' &&
      Array.isArray(obj.transferListItems) &&
      Array.isArray(obj.discardedItems) &&
      typeof obj.addItems === 'function' &&
      (typeof obj.managersToTransferList === 'number' ||
        typeof obj.managersDiscarded === 'number' ||
        typeof obj.packsOpened === 'number')
    );
  }

  function emptyLiveSummary() {
    return {
      packsOpened: 0,
      packsRemaining: null,
      packsPlanned: null,
      players: 0,
      playersToClub: 0,
      playersToTransfer: 0,
      playersDiscarded: 0,
      playersToSbcStorage: 0,
      duplicatedPlayers: 0,
      managers: 0,
      managersToClub: 0,
      managersToTransfer: 0,
      managersDiscarded: 0,
      duplicatedManagers: 0,
      items: 0,
      itemsToClub: 0,
      itemsToTransfer: 0,
      itemsDiscarded: 0,
      duplicatedItems: 0,
      coinsSpent: 0,
      coinsEarned: 0,
      coinsRedeemed: 0,
      /** discardValue of redeemed coin cards already inside coinsEarned */
      quickSellFromRedeemed: 0,
      topPulls: [],
    };
  }

  function resetLivePackSummaryTracking() {
    state.cachedPackOpenerState = null;
    state.liveSummary = emptyLiveSummary();
    state.seenPullKeys = new Set();
    state.seenCoinItems = new WeakSet();
    state.packClubPlayers = [];
    state.packSummaryLastHtml = '';
  }

  function claimCoinSource(obj) {
    if (!obj || typeof obj !== 'object') return true;
    if (!state.seenCoinItems) state.seenCoinItems = new WeakSet();
    if (state.seenCoinItems.has(obj)) return false;
    state.seenCoinItems.add(obj);
    return true;
  }

  function rememberFreeCoin(item, discarded) {
    if (!item || !isFreeCoinItem(item)) return;
    if (!claimCoinSource(item)) return;
    if (!state.liveSummary) state.liveSummary = emptyLiveSummary();
    state.liveSummary.coinsRedeemed += freeCoinAmount(item);
    if (!discarded) return;
    const discardValue = Number(item.discardValue);
    if (Number.isFinite(discardValue) && discardValue > 0) {
      state.liveSummary.quickSellFromRedeemed += discardValue;
    }
  }

  function isCoinReward(reward) {
    if (!reward || typeof reward !== 'object') return false;
    try {
      if (reward.isCoin === true || reward.isCoins === true) return true;
      if (typeof reward.isFreeCoins === 'function' && reward.isFreeCoins()) {
        return true;
      }
    } catch {
      /* ignore */
    }
    return (
      isFreeCoinItem(reward) ||
      isFreeCoinItem(reward.item) ||
      isFreeCoinItem(reward.utItem)
    );
  }

  function rewardCoinAmount(reward) {
    if (!isCoinReward(reward)) return 0;
    const countRaw = Number(reward.count);
    const count = Number.isFinite(countRaw) && countRaw > 0 ? countRaw : 1;
    const direct = [reward.value, reward.amount, reward.coins]
      .map((value) => Number(value))
      .find((value) => Number.isFinite(value) && value > 0);
    if (direct) return direct * count;
    const nested =
      freeCoinAmount(reward.item) ||
      freeCoinAmount(reward.utItem) ||
      freeCoinAmount(reward);
    if (nested) return nested;
    try {
      const staticData =
        typeof reward.getStaticData === 'function'
          ? reward.getStaticData()
          : null;
      const fromStatic = Number(staticData?.amount);
      if (Number.isFinite(fromStatic) && fromStatic > 0) return fromStatic;
    } catch {
      /* ignore */
    }
    return 0;
  }

  function noteRedeemedCoinRewards(rewards, source) {
    if (!state.packOpenerRunning || !rewards) return;
    const list = Array.isArray(rewards) ? rewards : [rewards];
    let total = 0;
    for (const reward of list) {
      if (!isCoinReward(reward)) continue;
      const amount = rewardCoinAmount(reward);
      if (amount <= 0) {
        log('Coin reward missing amount', {
          source,
          value: reward.value,
          amount: reward.amount,
          count: reward.count,
        });
        continue;
      }
      const item = reward.item || reward.utItem;
      if (item && !claimCoinSource(item)) continue;
      if (!item && !claimCoinSource(reward)) continue;
      total += amount;
    }
    if (total <= 0) return;
    if (!state.liveSummary) state.liveSummary = emptyLiveSummary();
    state.liveSummary.coinsRedeemed += total;
    log('Pack coins redeemed', { amount: total, source });
    updateLivePackSummaryPanel();
  }

  function flattenRewardGroups(groups) {
    if (!Array.isArray(groups)) return [];
    const out = [];
    for (const group of groups) {
      if (Array.isArray(group?.rewards)) out.push(...group.rewards);
      else if (group) out.push(group);
    }
    return out;
  }

  /**
   * "Coins Added" is EA's toast when a pack (or reward screen) grants coins.
   * The toast text has no amount; the reward objects do.
   */
  function installCoinRewardHooks() {
    if (state.coinRewardHooksInstalled) return;
    let missing = false;
    const hooks = [
      ['UTGameRewardsViewController', 'onButtonTapped', function () {
        return this.rewards;
      }],
      ['FCGameRewardsViewController', 'onButtonTapped', function () {
        return this.rewards;
      }],
      ['UTPlayerPicksViewController', 'grantRewards', function (rewards) {
        return rewards;
      }],
      [
        'UTOneClickSBCCompensationPopupViewController',
        '_processGrantedRewards',
        function () {
          return flattenRewardGroups(this._rewards);
        },
      ],
    ];
    for (const [ctorName, method, pick] of hooks) {
      const proto = win[ctorName]?.prototype;
      const current = proto?.[method];
      if (typeof current !== 'function') {
        missing = true;
        continue;
      }
      if (current.__paletoolsCompanionCoins) continue;
      function wrapped(...args) {
        try {
          noteRedeemedCoinRewards(pick.apply(this, args), ctorName);
        } catch (err) {
          log('coin reward hook error', err);
        }
        return current.apply(this, args);
      }
      wrapped.__paletoolsCompanionCoins = true;
      proto[method] = wrapped;
      log('Coin reward hook installed', { ctorName, method });
    }

    try {
      const dispatcher =
        typeof win.getDefaultDispatcher === 'function'
          ? win.getDefaultDispatcher()
          : null;
      const notify = dispatcher?.notify;
      if (typeof notify !== 'function') {
        missing = true;
      } else if (!notify.__paletoolsCompanionCoins) {
        const originalNotify = notify.bind(dispatcher);
        function wrappedNotify(event, caller, payload, ...rest) {
          try {
            if (
              state.packOpenerRunning &&
              win.AppNotification &&
              event === win.AppNotification.ITEM_REDEEM
            ) {
              noteRedeemedCoinRewards(payload, 'ITEM_REDEEM');
            }
          } catch (err) {
            log('ITEM_REDEEM coin hook error', err);
          }
          return originalNotify(event, caller, payload, ...rest);
        }
        wrappedNotify.__paletoolsCompanionCoins = true;
        dispatcher.notify = wrappedNotify;
        log('ITEM_REDEEM coin hook installed');
      }
    } catch (err) {
      log('Could not hook reward dispatcher', err);
      missing = true;
    }
    if (!missing) state.coinRewardHooksInstalled = true;
  }

  function rememberTopPull(item) {
    if (!isPlayer(item) || !state.liveSummary || !state.seenPullKeys) return;
    const key = String(
      item.id ?? item.definitionId ?? `${getItemDisplayName(item)}:${getItemRating(item)}`
    );
    if (state.seenPullKeys.has(key)) return;
    state.seenPullKeys.add(key);
    const row = {
      item,
      rating: getItemRating(item) || 0,
      name: getItemDisplayName(item),
    };
    const list = state.liveSummary.topPulls;
    list.push(row);
    list.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
    if (list.length > 8) list.length = 8;
  }

  function noteDisposition(items, disposition) {
    if (!state.packOpenerRunning || !items?.length) return;
    if (!state.liveSummary) state.liveSummary = emptyLiveSummary();
    const s = state.liveSummary;
    for (const item of items) {
      if (!item) continue;
      rememberFreeCoin(item, disposition === 'discarded');
      const dup = isDuplicate(item);
      if (isPlayer(item)) {
        s.players++;
        if (dup) s.duplicatedPlayers++;
        if (disposition === 'club') s.playersToClub++;
        else if (disposition === 'transfer') s.playersToTransfer++;
        else if (disposition === 'storage') s.playersToSbcStorage++;
        else if (disposition === 'discarded') s.playersDiscarded++;
        rememberTopPull(item);
      } else if (isManager(item)) {
        s.managers++;
        if (dup) s.duplicatedManagers++;
        if (disposition === 'club') s.managersToClub++;
        else if (disposition === 'transfer') s.managersToTransfer++;
        else if (disposition === 'discarded') s.managersDiscarded++;
      } else {
        s.items++;
        if (dup) s.duplicatedItems++;
        if (disposition === 'club') s.itemsToClub++;
        else if (disposition === 'transfer') s.itemsToTransfer++;
        else if (disposition === 'discarded') s.itemsDiscarded++;
      }
    }
  }

  function resolveMoveDisposition(pile) {
    const ItemPile = win.ItemPile;
    if (!ItemPile || pile == null) return null;
    if (ItemPile.TRANSFER != null && pile === ItemPile.TRANSFER) return 'transfer';
    if (ItemPile.CLUB != null && pile === ItemPile.CLUB) return 'club';
    if (ItemPile.STORAGE != null && pile === ItemPile.STORAGE) return 'storage';
    if (ItemPile.SBCSTORAGE != null && pile === ItemPile.SBCSTORAGE) {
      return 'storage';
    }
    if (ItemPile.SBC_STORAGE != null && pile === ItemPile.SBC_STORAGE) {
      return 'storage';
    }
    return null;
  }

  /**
   * Pack Opener keeps its stats object in a local closure during the run — it is
   * not on the DOM until the final results screen. Trap packsOpened assigns so we
   * can hold a live reference for the summary panel.
   */
  function installPackStateCapture() {
    if (state.packStateCaptureInstalled) return;
    try {
      state.prevPacksOpenedDescriptor = Object.getOwnPropertyDescriptor(
        Object.prototype,
        'packsOpened'
      );
      Object.defineProperty(Object.prototype, 'packsOpened', {
        configurable: true,
        enumerable: false,
        get() {
          return undefined;
        },
        set(value) {
          // Materialize a normal own property so Paletools keeps working after
          // we uninstall this trap (and so packsOpened++ updates the real field).
          Object.defineProperty(this, 'packsOpened', {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
          });
          const capture = () => {
            if (!isPackOpenerState(this)) return;
            if (state.cachedPackOpenerState !== this) {
              log('Captured live Pack Opener state');
            }
            state.cachedPackOpenerState = this;
          };
          capture();
          // Constructor sets packsOpened before the item arrays exist
          win.setTimeout(capture, 0);
        },
      });
      state.packStateCaptureInstalled = true;
    } catch (err) {
      log('Could not install packsOpened capture', err);
    }
  }

  function uninstallPackStateCapture() {
    if (!state.packStateCaptureInstalled) return;
    try {
      if (state.prevPacksOpenedDescriptor) {
        Object.defineProperty(
          Object.prototype,
          'packsOpened',
          state.prevPacksOpenedDescriptor
        );
      } else {
        delete Object.prototype.packsOpened;
      }
    } catch (err) {
      log('Could not uninstall packsOpened capture', err);
    }
    state.prevPacksOpenedDescriptor = null;
    state.packStateCaptureInstalled = false;
  }

  function parsePacksRemainingCount(message) {
    const text = String(message || '');
    const match = text.match(/(\d+)/);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  }

  function readPackOpenerPlannedCount() {
    try {
      const host = win.document.querySelector('#pack-opener-purchase-count');
      if (!host) return null;
      const input = host.querySelector('input');
      const fromInput = Number(input?.value);
      if (Number.isFinite(fromInput) && fromInput > 0) return fromInput;
      const fromText = Number(
        String(host.textContent || '').replace(/[^\d]/g, '')
      );
      if (Number.isFinite(fromText) && fromText > 0) return fromText;
    } catch {
      /* ignore */
    }
    return null;
  }

  function notePacksRemainingNotification(message) {
    if (!state.packOpenerRunning) return;
    if (!state.liveSummary) state.liveSummary = emptyLiveSummary();
    const remaining = parsePacksRemainingCount(message);
    if (remaining == null) return;

    // Dedupe duplicate toasts with the same remaining count
    if (state.liveSummary.packsRemaining === remaining) return;

    const prevRemaining = state.liveSummary.packsRemaining;
    state.liveSummary.packsRemaining = remaining;

    if (state.liveSummary.packsPlanned == null) {
      const planned = readPackOpenerPlannedCount();
      if (planned != null) state.liveSummary.packsPlanned = planned;
      else if (prevRemaining == null) {
        // First toast: at least one pack finished; infer planned = remaining + 1
        state.liveSummary.packsPlanned = remaining + 1;
      }
    }

    if (state.liveSummary.packsPlanned != null) {
      state.liveSummary.packsOpened = Math.max(
        0,
        state.liveSummary.packsPlanned - remaining
      );
    } else if (prevRemaining != null && remaining < prevRemaining) {
      state.liveSummary.packsOpened += prevRemaining - remaining;
    } else if (prevRemaining == null) {
      state.liveSummary.packsOpened = 1;
    }

    // State object should exist by now — refresh cache if possible
    if (!state.cachedPackOpenerState) {
      const found = findPackOpenerState();
      if (found) state.cachedPackOpenerState = found;
    }
    updateLivePackSummaryPanel();
  }

  function creditPackOpenerState(movedItems) {
    if (!movedItems?.length) return false;
    const packState = findPackOpenerState();
    if (!packState) return false;

    const movedSet = new Set(movedItems);
    packState.discardedItems = packState.discardedItems.filter(
      (item) => !movedSet.has(item)
    );
    for (const item of movedItems) {
      if (!packState.transferListItems.includes(item)) {
        packState.transferListItems.push(item);
      }
    }
    let managerCount = 0;
    let playerCount = 0;
    for (const item of movedItems) {
      if (isManager(item)) managerCount++;
      else if (isPlayer(item)) playerCount++;
    }
    if (managerCount) {
      packState.managersToTransferList =
        (packState.managersToTransferList || 0) + managerCount;
    }
    if (playerCount && typeof packState.playersToTransferList === 'number') {
      packState.playersToTransferList += playerCount;
    }
    log('Credited Pack Opener state for transfers', {
      managers: managerCount,
      players: playerCount,
    });
    return true;
  }

  function findPackOpenerState() {
    if (isPackOpenerState(state.cachedPackOpenerState)) {
      return state.cachedPackOpenerState;
    }

    const roots = [];
    const add = (value) => {
      if (value && typeof value === 'object') roots.push(value);
    };

    try {
      if (typeof win.getAppMain === 'function') {
        const app = win.getAppMain();
        add(app);
        add(app?.getRootViewController?.());
        add(app?.getRootViewController?.()?.getPresentedViewController?.());
        add(app?.getRootViewController?.()?.getCurrentViewController?.());
      }
    } catch {
      /* ignore */
    }

    for (const sel of [
      '.pack-opener-results',
      '#pack-opener-results',
      '#pack-opener-result',
      '.pack-opener-results-summary',
    ]) {
      const el = win.document.querySelector(sel);
      if (!el) continue;
      add(el);
      let cur = el;
      for (let i = 0; i < 6 && cur; i++) {
        add(cur);
        add(cur.controller);
        add(cur.__controller);
        add(cur.view);
        add(cur.__view);
        add(cur.viewmodel);
        add(cur.viewModel);
        add(cur.state);
        cur = cur.parentElement;
      }
    }

    const seen = new Set();
    const queue = [...roots];
    while (queue.length) {
      const obj = queue.shift();
      if (!obj || typeof obj !== 'object' || seen.has(obj)) continue;
      seen.add(obj);
      if (seen.size > 400) break;

      if (isPackOpenerState(obj)) {
        state.cachedPackOpenerState = obj;
        return obj;
      }
      if (isPackOpenerState(obj.state)) {
        state.cachedPackOpenerState = obj.state;
        return obj.state;
      }

      for (const key of [
        'state',
        'viewmodel',
        'viewModel',
        'controller',
        '_viewmodel',
        '_view',
        'view',
        'childViewControllers',
        '_childViewControllers',
      ]) {
        try {
          const value = obj[key];
          if (value && typeof value === 'object') queue.push(value);
          if (Array.isArray(value)) {
            for (const entry of value) {
              if (entry && typeof entry === 'object') queue.push(entry);
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    return state.cachedPackOpenerState && isPackOpenerState(state.cachedPackOpenerState)
      ? state.cachedPackOpenerState
      : null;
  }

  function setSummaryRowCount(matchFn, value) {
    const root =
      win.document.querySelector('.pack-opener-result') ||
      win.document.querySelector('.pack-opener-results-summary');
    if (!root) return false;
    let updated = false;
    for (const row of root.querySelectorAll('li')) {
      const label = (row.textContent || '').toLowerCase();
      const span = row.querySelector('span');
      if (!span || !matchFn(label)) continue;
      span.textContent = String(value);
      updated = true;
    }
    return updated;
  }

  function syncSummaryDomFromState(packState) {
    setSummaryRowCount(
      (label) =>
        label.includes('managers sent to transfer') ||
        label.includes('managers a la lista de transferencias') ||
        (label.includes('manager') &&
          label.includes('transfer') &&
          !label.includes('discard')),
      packState.managersToTransferList
    );
    setSummaryRowCount(
      (label) =>
        label.includes('discarded managers') ||
        label.includes('managers descartados') ||
        (label.includes('manager') && label.includes('discard')),
      packState.managersDiscarded
    );
    if (typeof packState.playersToTransferList === 'number') {
      setSummaryRowCount(
        (label) =>
          (label.includes('players sent to transfer') ||
            label.includes('jugadores a la lista de transferencia') ||
            (label.includes('player') &&
              label.includes('transfer') &&
              !label.includes('discard') &&
              !label.includes('manager'))) &&
          !label.includes('listed'),
        packState.playersToTransferList
      );
    }
  }

  function ensureListedSummaryRows(entries) {
    const root =
      win.document.querySelector('.pack-opener-result') ||
      win.document.querySelector('.pack-opener-results-summary');
    if (!root) return false;

    const ul = root.querySelector('ul') || root;
    const playerCount = entries.filter((e) => isPlayer(e.item)).length;
    const managerCount = entries.filter((e) => isManager(e.item)).length;

    const upsert = (id, label, count, beforeMatch) => {
      if (!count) {
        root.querySelector(`#${id}`)?.remove();
        return;
      }
      let row = root.querySelector(`#${id}`);
      if (!row) {
        row = win.document.createElement('li');
        row.id = id;
        row.innerHTML = `<b>${label}</b><span>0</span>`;
        const before = [...ul.querySelectorAll('li')].find((li) =>
          beforeMatch((li.textContent || '').toLowerCase())
        );
        if (before) ul.insertBefore(row, before);
        else ul.appendChild(row);
      }
      const span = row.querySelector('span');
      if (span) span.textContent = String(count);
    };

    upsert(
      'companion-listed-players-summary-row',
      'Players listed on market:',
      playerCount,
      (label) => label.includes('duplicated players')
    );
    upsert(
      'companion-listed-managers-summary-row',
      'Managers listed on market:',
      managerCount,
      (label) =>
        label.includes('duplicated managers') ||
        label.includes('discarded managers')
    );
    return playerCount + managerCount > 0;
  }

  function injectListedDetailRecap(entries) {
    if (!entries?.length) return false;
    const host =
      win.document.querySelector('.pack-opener-results-summary') ||
      win.document.querySelector('.pack-opener-results') ||
      win.document.querySelector('.pack-opener-result')?.parentElement;
    if (!host) return false;

    let panel = win.document.getElementById('companion-listed-recap');
    if (!panel) {
      panel = win.document.createElement('div');
      panel.id = 'companion-listed-recap';
      panel.style.cssText = [
        'margin:12px 0 0',
        'padding:10px',
        'border:1px solid rgba(78,230,235,0.45)',
        'border-radius:4px',
        'background:rgba(0,0,0,0.25)',
        'color:#f3f3f3',
        'font:12px/1.35 sans-serif',
      ].join(';');
      const resultBox = host.querySelector('.pack-opener-result');
      if (resultBox?.parentElement) {
        resultBox.parentElement.insertBefore(panel, resultBox.nextSibling);
      } else {
        host.appendChild(panel);
      }
    }

    const rows = entries
      .map((entry) => {
        const label = listedEntryLabel(entry);
        const price = `BIN ${formatCoins(entry.buyNow)}`;
        const bid =
          entry.bid != null ? ` · start ${formatCoins(entry.bid)}` : '';
        return `<li style="display:flex;justify-content:space-between;gap:12px;padding:2px 0;"><span>${escapeHtml(label)}</span><span style="white-space:nowrap;color:#4ee6eb;">${escapeHtml(price)}${escapeHtml(bid)}</span></li>`;
      })
      .join('');

    panel.innerHTML = `
      <div style="font-weight:700;color:#4ee6eb;margin-bottom:6px;">
        Companion auto-listed (${entries.length})
      </div>
      <ul style="list-style:none;margin:0;padding:0;">${rows}</ul>
    `;
    state.listedRecapPatched = true;
    return true;
  }

  function listedEntryLabel(entry) {
    const name = getItemDisplayName(entry.item);
    const rating = getItemRating(entry.item);
    const kind = isManager(entry.item) ? 'Mgr' : 'Player';
    const base = rating != null ? `${name} (${rating})` : name;
    return `${kind}: ${base}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function creditPackOpenerListedState(entries) {
    if (!entries?.length) return false;
    const packState = findPackOpenerState();
    if (!packState) return false;

    const listedSet = new Set(entries.map((e) => e.item));
    packState.discardedItems = packState.discardedItems.filter(
      (item) => !listedSet.has(item)
    );
    // Keep listed cards out of the plain transfer-list bucket; they get their own recap.
    packState.transferListItems = packState.transferListItems.filter(
      (item) => !listedSet.has(item)
    );
    return true;
  }

  function patchResultsSummaryDom(movedCount) {
    if (!movedCount || state.domRecapPatched) return;
    const root =
      win.document.querySelector('.pack-opener-result') ||
      win.document.querySelector('.pack-opener-results-summary');
    if (!root) return;

    for (const row of root.querySelectorAll('li')) {
      const label = (row.textContent || '').toLowerCase();
      const span = row.querySelector('span');
      if (!span) continue;
      const current = parseInt(String(span.textContent).replace(/[^\d-]/g, ''), 10);
      if (Number.isNaN(current)) continue;

      if (
        label.includes('managers sent to transfer') ||
        label.includes('managers a la lista de transferencias') ||
        (label.includes('manager') &&
          label.includes('transfer') &&
          !label.includes('discard'))
      ) {
        span.textContent = String(current + movedCount);
        state.domRecapPatched = true;
        log('Patched transfer summary count to', span.textContent);
      }
    }
  }

  function applyPendingCompanionRecap() {
    const hasTransfers = state.pendingTransferCount > 0;
    const hasListed = state.pendingListedEntries.length > 0;
    if (!hasTransfers && !hasListed) return;

    const moved = state.pendingTransferItems.slice();
    const listed = state.pendingListedEntries.slice();
    const packState = findPackOpenerState();
    let transfersApplied = !hasTransfers;
    let listedApplied = !hasListed;

    if (packState) {
      if (hasTransfers) {
        const alreadyCredited = moved.every((item) =>
          packState.transferListItems.includes(item)
        );
        if (!alreadyCredited) {
          creditPackOpenerState(moved);
        }
        syncSummaryDomFromState(packState);
        transfersApplied = true;
      } else {
        syncSummaryDomFromState(packState);
      }
      if (hasListed) {
        creditPackOpenerListedState(listed);
      }
    } else if (hasTransfers) {
      patchResultsSummaryDom(state.pendingTransferCount);
      transfersApplied = state.domRecapPatched;
    }

    if (hasListed) {
      const summaryOk = ensureListedSummaryRows(listed);
      const detailOk = injectListedDetailRecap(listed);
      listedApplied = summaryOk || detailOk;
    }

    if (transfersApplied) {
      state.pendingTransferItems = [];
      state.pendingTransferCount = 0;
    }
    if (listedApplied) {
      state.pendingListedEntries = [];
    }
  }

  function applyPendingTransferRecap() {
    applyPendingCompanionRecap();
  }

  function resetEarlyStopState() {
    state.packOpenerRunning = false;
    state.earlyStopRequested = false;
    state.earlyStopArmed = false;
    state.earlyStopTriggered = false;
    state.packOpenerSoftBanned = false;
    state.tlFullCleanupGaveUp = false;
    state.tlFullCleanupPromise = null;
    stopLivePackSummaryUpdates();
    uninstallPackStateCapture();
    updateEarlyStopButton();
    updateLivePackSummaryPanel();
  }

  function markPackOpenerRunning() {
    state.packOpenerRunning = true;
    state.earlyStopRequested = false;
    state.earlyStopArmed = false;
    state.earlyStopTriggered = false;
    state.packOpenerSoftBanned = false;
    state.tlFullCleanupGaveUp = false;
    state.tlFullCleanupPromise = null;
    resetLivePackSummaryTracking();
    const planned = readPackOpenerPlannedCount();
    if (planned != null) state.liveSummary.packsPlanned = planned;
    installPackStateCapture();
    updateEarlyStopButton();
    installEarlyStopHooks();
    installServiceHooks();
    ensureLivePackSummaryPanel();
    startLivePackSummaryUpdates();
    updateLivePackSummaryPanel();
    log('Pack Opener running — early-stop + live summary available', {
      packsPlanned: state.liveSummary.packsPlanned,
    });
  }

  function numStateField(obj, ...keys) {
    if (!obj) return 0;
    for (const key of keys) {
      if (key == null) continue;
      const n = Number(obj[key]);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  function collectPackItemArrays(packState) {
    if (!packState) return [];
    const out = [];
    for (const key of [
      'clubItems',
      'storageItems',
      'transferListItems',
      'unassignedItems',
      'discardedItems',
    ]) {
      const arr = packState[key];
      if (Array.isArray(arr)) out.push(...arr);
    }
    return out;
  }

  function getTopPullLabels(packState, limit = 5) {
    const players = collectPackItemArrays(packState)
      .filter((item) => isPlayer(item))
      .map((item) => ({
        item,
        rating: getItemRating(item) || 0,
        name: getItemDisplayName(item),
      }))
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));

    const seen = new Set();
    const top = [];
    for (const row of players) {
      const id = row.item?.id ?? row.item?.definitionId ?? row.name + row.rating;
      if (seen.has(id)) continue;
      seen.add(id);
      top.push(row);
      if (top.length >= limit) break;
    }
    return top;
  }

  /** Snapshot Pack Opener counters — prefer live captured state, else our tallies. */
  function readLivePackSummary() {
    const packState = findPackOpenerState();
    const tallies = state.liveSummary || emptyLiveSummary();
    const listed = state.pendingListedEntries || [];
    const coinsFromTransfer = listed.reduce(
      (sum, entry) => sum + coinsAfterMarketTax(entry.buyNow),
      0
    );
    if (packState) {
      const discarded = new Set(packState.discardedItems || []);
      for (const item of collectPackItemArrays(packState)) {
        rememberFreeCoin(item, discarded.has(item));
      }
    }
    const playersListed = listed.filter((entry) => isPlayer(entry.item)).length;

    const fromState = (keys, fallback) => {
      if (!packState) return fallback;
      const n = numStateField(packState, ...keys);
      // Prefer state when it has moved past the zeroed constructor defaults
      // or when we already know a pack completed.
      if (n > 0 || numStateField(packState, 'packsOpened') > 0) return n;
      return fallback;
    };

    // Prefer Paletools' packsOpened when captured — notification tallies are fallback only
    const packsFromState = numStateField(packState, 'packsOpened');
    const packs =
      packState && packsFromState > 0
        ? packsFromState
        : tallies.packsOpened || 0;
    const packsPlanned = tallies.packsPlanned;
    const packsTotal =
      packsPlanned != null
        ? packsPlanned
        : tallies.packsRemaining != null
          ? packs + tallies.packsRemaining
          : null;
    const topFromState = getTopPullLabels(packState, 5);
    const topPulls =
      topFromState.length > 0 ? topFromState : tallies.topPulls.slice(0, 5);

    const transferResidents = [
      ...(state.pendingTransferItems || []),
      ...(Array.isArray(packState?.transferListItems) ? packState.transferListItems : []),
    ];
    forgetPackClubPlayers([
      ...transferResidents,
      ...listed.map((entry) => entry.item),
    ]);
    const playersToClub = (state.packClubPlayers || []).filter((item) => {
      if (!isPlayer(item) || itemIsOnTransfer(item)) return false;
      if (listed.some((entry) => samePackItem(entry.item, item))) return false;
      if (transferResidents.some((other) => samePackItem(other, item))) return false;
      return true;
    }).length;
    const playersToTransfer = fromState(
      ['playersToTransferList', 'playersToTransfer'],
      tallies.playersToTransfer
    );
    const coinsSpent = fromState(['coinsSpent'], tallies.coinsSpent);
    const coinsEarned = fromState(['coinsEarned'], tallies.coinsEarned);
    const coinsRedeemed = tallies.coinsRedeemed || 0;
    const coinsQuickSell = Math.max(
      0,
      coinsEarned - (tallies.quickSellFromRedeemed || 0)
    );
    const coinsEarnedBack = coinsRedeemed + coinsQuickSell + coinsFromTransfer;
    const profit = coinsEarnedBack - coinsSpent;

    return {
      packs,
      packsTotal,
      packsRemaining: tallies.packsRemaining,
      players: fromState(['players'], tallies.players),
      playersToClub,
      playersListed,
      playersUnlisted: playersToTransfer,
      playersToTransfer,
      playersDiscarded: fromState(
        ['playersDiscarded'],
        tallies.playersDiscarded
      ),
      playersToSbcStorage: fromState(
        ['playersToSbcStorage', 'duplicatedPlayersToSbcStorage'],
        tallies.playersToSbcStorage
      ),
      duplicatedPlayers: fromState(
        ['duplicatedPlayers'],
        tallies.duplicatedPlayers
      ),
      managers: fromState(['managers'], tallies.managers),
      managersToClub: fromState(['managersToClub'], tallies.managersToClub),
      managersToTransfer: fromState(
        ['managersToTransferList', 'managersToTransfer'],
        tallies.managersToTransfer
      ),
      managersDiscarded: fromState(
        ['managersDiscarded'],
        tallies.managersDiscarded
      ),
      duplicatedManagers: fromState(
        ['duplicatedManagers'],
        tallies.duplicatedManagers
      ),
      items: fromState(['items'], tallies.items),
      itemsToClub: fromState(['itemsToClub'], tallies.itemsToClub),
      itemsToTransfer: fromState(
        ['itemsToTransferList', 'itemsToTransfer'],
        tallies.itemsToTransfer
      ),
      itemsDiscarded: fromState(['itemsDiscarded'], tallies.itemsDiscarded),
      duplicatedItems: fromState(['duplicatedItems'], tallies.duplicatedItems),
      coinsSpent,
      coinsQuickSell,
      coinsRedeemed,
      coinsFromTransfer,
      coinsEarnedBack,
      profit,
      profitPerPack: packs > 0 ? Math.round(profit / packs) : 0,
      topPulls,
      hasState: !!(packState || packs > 0 || listed.length),
    };
  }

  function summaryRow(label, value, options = {}) {
    const always = !!options.always;
    const n = Number(value) || 0;
    if (!always && n <= 0) return '';
    let display;
    let tone = '';
    if (options.signed) {
      display = formatSignedCoins(n);
      if (n > 0) tone = ' companion-sum-pos';
      else if (n < 0) tone = ' companion-sum-neg';
    } else if (options.coins && Number.isFinite(n)) {
      display = formatCoins(n);
    } else {
      display = String(n);
    }
    return `<div class="companion-sum-row${tone}"><span>${escapeHtml(label)}</span><b>${escapeHtml(display)}</b></div>`;
  }

  function summarySection(title, rowsHtml) {
    if (!rowsHtml) return '';
    return `<div class="companion-sum-section"><div class="companion-sum-h">${escapeHtml(title)}</div>${rowsHtml}</div>`;
  }

  function renderLivePackSummaryHtml(summary) {
    const s = summary || readLivePackSummary();
    const playerRows =
      summaryRow('Total', s.players, { always: true }) +
      summaryRow('Listed on Transfer List', s.playersListed, { always: true }) +
      summaryRow('Unlisted on Transfer List', s.playersUnlisted, {
        always: true,
      }) +
      summaryRow('To Club', s.playersToClub, { always: true });

    const managerRows =
      summaryRow('Total', s.managers, { always: true }) +
      summaryRow('→ Club', s.managersToClub) +
      summaryRow('→ Transfer list', s.managersToTransfer) +
      summaryRow('Discarded', s.managersDiscarded) +
      summaryRow('Duplicates', s.duplicatedManagers);

    const itemRows =
      summaryRow('Total', s.items, { always: true }) +
      summaryRow('→ Club', s.itemsToClub) +
      summaryRow('→ Transfer list', s.itemsToTransfer) +
      summaryRow('Discarded', s.itemsDiscarded) +
      summaryRow('Duplicates', s.duplicatedItems);

    const coinRows =
      summaryRow('Spent', s.coinsSpent, { always: true, coins: true }) +
      summaryRow('Redeemed', s.coinsRedeemed, { always: true, coins: true }) +
      summaryRow('Quick sell', s.coinsQuickSell, { always: true, coins: true }) +
      summaryRow('Transfer list (95%)', s.coinsFromTransfer, {
        always: true,
        coins: true,
      }) +
      summaryRow('Earned back', s.coinsEarnedBack, {
        always: true,
        coins: true,
      }) +
      summaryRow('P/L', s.profit, { always: true, signed: true }) +
      summaryRow('P/L per pack', s.profitPerPack, { always: true, signed: true });

    const topPulls = (s.topPulls || [])
      .map((row) => {
        const label =
          row.rating > 0 ? `${row.name} (${row.rating})` : row.name;
        return `<div class="companion-sum-row companion-sum-pull"><span>${escapeHtml(label)}</span></div>`;
      })
      .join('');

    const packLabel =
      s.packsTotal != null ? `${s.packs}/${s.packsTotal}` : String(s.packs);
    const waiting =
      !s.hasState && s.packs <= 0
        ? `<div class="companion-sum-wait">Waiting for Pack Opener stats…</div>`
        : '';

    return `
      <div class="companion-sum-title">Pack run summary</div>
      <div class="companion-sum-packs">${escapeHtml(packLabel)} <span>packs opened</span></div>
      ${waiting}
      ${summarySection('Players', playerRows)}
      ${summarySection('Managers', managerRows)}
      ${summarySection('Other items', itemRows)}
      ${summarySection('Coins', coinRows)}
      ${topPulls ? summarySection('Top pulls', topPulls) : ''}
    `;
  }

  function ensureLivePackSummaryPanel() {
    let panel = win.document.getElementById('companion-pack-live-summary');
    if (!panel) {
      panel = win.document.createElement('div');
      panel.id = 'companion-pack-live-summary';
      panel.style.cssText = [
        'position:fixed',
        'left:12px',
        'bottom:52px',
        'z-index:99999',
        'width:min(320px,calc(100vw - 24px))',
        'max-height:min(72vh,680px)',
        'overflow:auto',
        'padding:12px 12px 10px',
        'border:1px solid rgba(78,230,235,0.45)',
        'border-radius:4px',
        'background:rgba(15,20,28,0.92)',
        'color:#f3f3f3',
        'font:12px/1.35 sans-serif',
        'box-shadow:0 2px 12px rgba(0,0,0,0.4)',
        'display:none',
        'pointer-events:none',
      ].join(';');

      if (!win.document.getElementById('companion-pack-live-summary-style')) {
        const style = win.document.createElement('style');
        style.id = 'companion-pack-live-summary-style';
        style.textContent = `
          #companion-pack-live-summary .companion-sum-title{
            font-weight:700;color:#4ee6eb;margin-bottom:6px;letter-spacing:0.02em;
          }
          #companion-pack-live-summary .companion-sum-packs{
            font-size:22px;font-weight:700;margin:0 0 10px;color:#fff;
          }
          #companion-pack-live-summary .companion-sum-packs span{
            font-size:12px;font-weight:600;color:#9aa4b2;margin-left:4px;
          }
          #companion-pack-live-summary .companion-sum-section{margin-top:10px;}
          #companion-pack-live-summary .companion-sum-h{
            font-weight:700;color:#4ee6eb;margin-bottom:4px;font-size:11px;
            text-transform:uppercase;letter-spacing:0.04em;
          }
          #companion-pack-live-summary .companion-sum-row{
            display:flex;justify-content:space-between;gap:10px;padding:1px 0;
          }
          #companion-pack-live-summary .companion-sum-row b{color:#fff;font-variant-numeric:tabular-nums;}
          #companion-pack-live-summary .companion-sum-pos b{color:#7dffa1;}
          #companion-pack-live-summary .companion-sum-neg b{color:#ff8d7a;}
          #companion-pack-live-summary .companion-sum-row span{color:#c7ced8;}
          #companion-pack-live-summary .companion-sum-pull span{color:#e8eef7;}
          #companion-pack-live-summary .companion-sum-wait{
            opacity:0.75;font-size:11px;margin-bottom:6px;
          }
        `;
        (win.document.head || win.document.documentElement).appendChild(style);
      }

      (win.document.body || win.document.documentElement).appendChild(panel);
    }
    return panel;
  }

  function updateLivePackSummaryPanel() {
    const panel = win.document.getElementById('companion-pack-live-summary');
    if (!state.packOpenerRunning) {
      if (panel) panel.style.display = 'none';
      return;
    }
    const el = panel || ensureLivePackSummaryPanel();
    const html = renderLivePackSummaryHtml(readLivePackSummary());
    if (html !== state.packSummaryLastHtml) {
      state.companionDomWrite = true;
      el.innerHTML = html;
      state.packSummaryLastHtml = html;
      state.companionDomWrite = false;
    }
    el.style.display = '';
  }

  function startLivePackSummaryUpdates() {
    if (state.packSummaryTimer != null) return;
    state.packSummaryTimer = win.setInterval(() => {
      try {
        if (!state.packOpenerRunning) {
          stopLivePackSummaryUpdates();
          updateLivePackSummaryPanel();
          return;
        }
        updateLivePackSummaryPanel();
      } catch (err) {
        warn('live summary update error', err);
      }
    }, 750);
  }

  function stopLivePackSummaryUpdates() {
    if (state.packSummaryTimer != null) {
      win.clearInterval(state.packSummaryTimer);
      state.packSummaryTimer = null;
    }
  }

  function requestEarlyStop() {
    if (!state.packOpenerRunning) return;
    state.earlyStopRequested = true;
    // Safe to arm now: Paletools only checks PURCHASED count at the *next* pack open
    state.earlyStopArmed = true;
    updateEarlyStopButton();
    try {
      win.services?.Notification?.queue?.([
        'Companion: will stop after the current pack finishes',
        win.UINotificationType?.NEUTRAL ?? 0,
      ]);
    } catch {
      /* ignore */
    }
    log('Early stop requested and armed');
  }

  function updateEarlyStopButton() {
    const btn = win.document.getElementById('companion-pack-early-stop');
    if (!btn) return;
    if (!state.packOpenerRunning) {
      btn.style.display = 'none';
      return;
    }
    btn.style.display = '';
    if (state.earlyStopRequested) {
      btn.textContent = 'Stopping after this pack…';
      btn.disabled = true;
      btn.style.opacity = '0.85';
    } else {
      btn.textContent = 'Stop after this pack';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }

  function ensureEarlyStopButton() {
    let btn = win.document.getElementById('companion-pack-early-stop');
    if (!btn) {
      btn = win.document.createElement('button');
      btn.id = 'companion-pack-early-stop';
      btn.type = 'button';
      btn.textContent = 'Stop after this pack';
      btn.title =
        'Finish the current pack, then stop Pack Opener (show results)';
      btn.style.cssText = [
        'position:fixed',
        'right:12px',
        'bottom:52px',
        'z-index:99999',
        'padding:10px 12px',
        'border:none',
        'border-radius:4px',
        'background:#c23b22',
        'color:#fff',
        'font:12px/1.2 sans-serif',
        'cursor:pointer',
        'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
        'display:none',
      ].join(';');
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        requestEarlyStop();
      });
      (win.document.body || win.document.documentElement).appendChild(btn);
    }
    updateEarlyStopButton();
  }

  function looksLikePacksRemainingMessage(message) {
    const text = String(message || '').toLowerCase();
    if (!text) return false;
    return (
      text.includes('packs left') ||
      text.includes('packs to be opened') ||
      text.includes('packs por') ||
      text.includes('packs remaining') ||
      text.includes('pack left') ||
      text.includes('packs por abrir')
    );
  }

  function looksLikeUnassignedStopMessage(message) {
    const text = String(message || '').toLowerCase();
    return (
      text.includes('unassigned') ||
      text.includes('no asignad') ||
      text.includes('non assegn') ||
      text.includes('não atribu') ||
      text.includes('nicht zugew') ||
      text.includes('non assign')
    );
  }

  function looksLikePackOpenerStopMessage(message) {
    const text = String(message || '').toLowerCase();
    return (
      looksLikeUnassignedStopMessage(message) ||
      text.includes('transfer list is full') ||
      text.includes('error opening the pack') ||
      text.includes('not enough') ||
      text.includes('storage full') ||
      text.includes('storage is full')
    );
  }

  function installEarlyStopHooks() {
    const repos = win.repositories?.Item;
    const ItemPile = win.ItemPile;
    if (repos && typeof repos.numItemsInCache === 'function' && ItemPile) {
      const current = repos.numItemsInCache;
      if (!current.__paletoolsCompanionEarlyStop) {
        const original = current.bind(repos);
        function companionNumItemsInCache(pile) {
          // Only block the *next* pack after an explicit early-stop request.
          // Require all three flags so a stale arm can't prevent Pack Opener from starting.
          if (
            state.packOpenerRunning &&
            state.earlyStopRequested &&
            state.earlyStopArmed &&
            ItemPile.PURCHASED != null &&
            pile === ItemPile.PURCHASED
          ) {
            state.earlyStopTriggered = true;
            log('Early-stop gate: blocking next pack open');
            return 1;
          }
          if (ItemPile.PURCHASED != null && pile === ItemPile.PURCHASED) {
            pruneUnassignedAlreadyMoved();
          }
          const count = original(pile);
          if (
            state.packOpenerRunning &&
            ItemPile.PURCHASED != null &&
            pile === ItemPile.PURCHASED &&
            count > 0
          ) {
            const now = Date.now();
            if (
              state.lastUnassignedBlockLog !== count ||
              now - (state.lastUnassignedBlockAt || 0) > 5000
            ) {
              state.lastUnassignedBlockLog = count;
              state.lastUnassignedBlockAt = now;
              log('Next pack blocked by unassigned cache', {
                count,
                names: cachedPileItems(win.repositories?.Item?.unassigned)
                  .slice(0, 8)
                  .map((item) => getItemDisplayName(item)),
              });
            }
          }
          return count;
        }
        companionNumItemsInCache.__paletoolsCompanionEarlyStop = true;
        repos.numItemsInCache = companionNumItemsInCache;
        log('Early-stop numItemsInCache hook installed');
      }
    }

    const notif = win.services?.Notification;
    if (notif && typeof notif.queue === 'function' && !notif.queue.__paletoolsCompanionEarlyStop) {
      const originalQueue = notif.queue.bind(notif);
      function companionNotifyQueue(...args) {
        try {
          const payload = args[0];
          const parts = Array.isArray(payload) ? payload : [payload];
          const message = parts[0];
          const type = parts[1];

          if (
            state.packOpenerRunning &&
            looksLikePacksRemainingMessage(message)
          ) {
            notePacksRemainingNotification(message);
            if (state.earlyStopRequested) {
              // Current pack finished — keep arm for the next open attempt
              state.earlyStopArmed = true;
              log('Early-stop armed after pack completed');
            }
          }

          if (state.packOpenerRunning && looksLikePackOpenerStopMessage(message)) {
            log('Pack Opener stop notice', { message: String(message) });
          }

          if (
            state.earlyStopTriggered &&
            looksLikeUnassignedStopMessage(message)
          ) {
            const neutral = win.UINotificationType?.NEUTRAL ?? type;
            originalQueue.apply(notif, [
              ['Pack Opener stopped after the current pack', neutral],
            ]);
            resetEarlyStopState();
            return;
          }
        } catch (err) {
          log('Notification early-stop hook error', err);
        }
        return originalQueue.apply(notif, args);
      }
      companionNotifyQueue.__paletoolsCompanionEarlyStop = true;
      notif.queue = companionNotifyQueue;
      log('Early-stop Notification.queue hook installed');
    }
  }

  function installServiceHooks() {
    installCoinRewardHooks();
    installEarlyStopHooks();
    installTransferFullMask();

    const services = win.services;
    if (!services?.Item || !win.ItemPile) return false;

    if (
      typeof services.Item.move === 'function' &&
      !services.Item.move.__paletoolsCompanionSummaryHook
    ) {
      const originalMove = services.Item.move.bind(services.Item);
      function companionMove(items, pile, ...rest) {
        const list = Array.isArray(items) ? items : items ? [items] : [];
        const disposition = resolveMoveDisposition(pile);
        // TL cleanup moves are not pack pulls — don't count them in the live summary.
        if (disposition && !state.tlFullCleanupPromise) {
          noteDisposition(list, disposition);
        }
        return originalMove(items, pile, ...rest);
      }
      companionMove.__paletoolsCompanionSummaryHook = true;
      services.Item.move = companionMove;
      log('Item.move summary hook installed');
    }

    if (
      typeof services.Item.redeem === 'function' &&
      !services.Item.redeem.__paletoolsCompanionCoins
    ) {
      const originalRedeem = services.Item.redeem.bind(services.Item);
      function companionRedeem(item, ...rest) {
        try {
          noteRedeemedCoinRewards(item, 'Item.redeem');
        } catch (err) {
          log('Item.redeem coin hook error', err);
        }
        return originalRedeem(item, ...rest);
      }
      companionRedeem.__paletoolsCompanionCoins = true;
      services.Item.redeem = companionRedeem;
      log('Item.redeem coin hook installed');
    }

    const current = services.Item.discard;
    if (current && current.__paletoolsCompanionHook) return true;
    if (typeof services.Item.discard !== 'function') return false;
    if (typeof services.Item.move !== 'function') return false;

    const originalDiscard = services.Item.discard.bind(services.Item);
    state.originalDiscard = originalDiscard;

    function companionDiscard(items) {
      const list = Array.isArray(items) ? items : items ? [items] : [];
      // Pack rules only apply while Pack Opener is running (manual QS / club scan stay raw).
      const shouldRoute =
        !state.processing && state.packOpenerRunning && isPackRulesActive();

      if (!shouldRoute) {
        if (state.packOpenerRunning) noteDisposition(list, 'discarded');
        return originalDiscard(list);
      }

      log('Intercepting discard for companion pack rules', {
        count: list.length,
      });
      return asObservable(async () => {
        state.processing = true;
        try {
          return await handlePackRulesDiscard(list, originalDiscard);
        } finally {
          state.processing = false;
        }
      });
    }
    companionDiscard.__paletoolsCompanionHook = true;

    services.Item.discard = companionDiscard;
    log('Item.discard hook installed');
    return true;
  }

  /**
   * Force a native Pack Opener category select to quickSell so Paletools always
   * hits Item.discard; companion pack rules then own the real disposition.
   */
  function forceSelectToQuickSellFacade(select) {
    if (!select) return;
    if ([...select.options].some((opt) => opt.value === FACADE_ACTION)) {
      setSelectValue(select, FACADE_ACTION);
    } else if (select.options.length) {
      // Fallback: first built-in discard-like option
      for (const opt of select.options) {
        if (/quick\s*sell|discard/i.test(opt.textContent || '')) {
          select.value = opt.value;
          break;
        }
      }
    }
    select.dataset.companionFacade = '1';
  }

  function forceNativePackCategorySelectsToFacade(root = win.document) {
    for (const selector of NATIVE_PACK_CATEGORY_SELECTORS) {
      const select = root.querySelector?.(selector) || win.document.querySelector(selector);
      forceSelectToQuickSellFacade(select);
    }
  }

  function hideNativePackCategoryPrompt(select) {
    if (!select || select.dataset.companionPromptHidden === '1') return;
    const id = select.id;
    const label =
      (id &&
        select.ownerDocument.querySelector(`label[for="${id}"]`)) ||
      null;
    if (label) {
      label.style.display = 'none';
      label.dataset.companionPromptHidden = '1';
    }
    select.style.display = 'none';
    select.dataset.companionPromptHidden = '1';

    // Hide a simple wrapper row when the select is the only meaningful child
    const parent = select.parentElement;
    if (
      parent &&
      parent !== select.ownerDocument.body &&
      parent.children.length <= 3 &&
      !parent.querySelector(
        '#companion-pack-rules, #companion-important-manager-nations, #companion-important-duplicate-leagues'
      )
    ) {
      const onlyPrompt =
        [...parent.children].every(
          (el) =>
            el === select ||
            el === label ||
            el.tagName === 'LABEL' ||
            el.tagName === 'SELECT' ||
            (el.tagName === 'SPAN' && !(el.textContent || '').trim())
        );
      if (onlyPrompt) {
        parent.style.display = 'none';
        parent.dataset.companionPromptHidden = '1';
      }
    }
  }

  function hideNativePackCategoryPrompts(dialog) {
    if (!dialog) return;
    for (const selector of NATIVE_PACK_CATEGORY_SELECTORS) {
      const select = dialog.querySelector(selector);
      if (select) hideNativePackCategoryPrompt(select);
    }
  }

  function findSbcSet(setId, sets) {
    const id = Number(setId);
    if (!(id > 0)) return null;
    const repo = win.repositories?.SBC;
    try {
      const direct = typeof repo?.getSetById === 'function' ? repo.getSetById(id) : null;
      if (direct) return direct;
    } catch {
      /* ignore */
    }
    return (sets || collectSbcSets()).find((entry) => Number(entry?.id) === id) || null;
  }

  function challengesOnSet(set) {
    const listed = iterCollection(
      typeof set?.getChallenges === 'function' ? set.getChallenges() : null
    );
    if (listed.length) return listed;
    return iterCollection(set?.challenges);
  }

  function sbcText(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    try {
      const localize = win.services?.Localization?.localize;
      if (typeof localize === 'function') {
        const translated = String(localize(text) || '').replace(/\s+/g, ' ').trim();
        if (translated && translated !== text && !/^\[missing/i.test(translated)) return translated;
      }
    } catch {
      /* ignore */
    }
    return text;
  }

  function isGenericSbcLabel(text) {
    return (
      !text ||
      /^sbc(?:\s+set)?\s+\d+$/i.test(text) ||
      /^set\s+\d+$/i.test(text) ||
      /^challenge\s+\d+$/i.test(text)
    );
  }

  /** Title shown on the SBC, not the short set name or id. */
  function sbcOptionTitle(set, challenge) {
    const setName = sbcText(set?.name || set?._name);
    const challengeName = sbcText(challenge?.name || challenge?._name);
    const description = sbcText(
      challenge?.description || challenge?._description || set?.description || set?._description
    );
    const titled =
      (!isGenericSbcLabel(challengeName) && challengeName) ||
      (!isGenericSbcLabel(setName) && setName) ||
      (!isGenericSbcLabel(description) && description) ||
      challengeName ||
      setName ||
      description ||
      `SBC set ${set?.id ?? ''}`;
    if (
      setName &&
      challengeName &&
      !isGenericSbcLabel(setName) &&
      !isGenericSbcLabel(challengeName) &&
      setName !== challengeName
    ) {
      return `${setName} — ${challengeName}`;
    }
    return titled.length > 90 ? `${titled.slice(0, 87)}…` : titled;
  }

  function setNeedsChallengeTitle(set) {
    if (!set) return false;
    const challenges = challengesOnSet(set);
    if (challenges.length === 1) return isGenericSbcLabel(sbcOptionTitle(set, challenges[0]));
    return isGenericSbcLabel(sbcOptionTitle(set, null));
  }

  async function ensureSbcTitlesLoaded(rows) {
    const needed = [];
    for (const row of rows || []) {
      const match = /^s(\d+)$/i.exec(String(row?.challengeId ?? '').trim());
      if (match) needed.push(Number(match[1]));
    }
    let sets = collectSbcSets();
    const missing = needed.filter((id) => !findSbcSet(id, sets));
    if (!sets.length || missing.length) {
      const now = Date.now();
      const refreshedRecently =
        sets.length > 0 &&
        missing.length > 0 &&
        state.tlFullSbcSetRefreshAt &&
        now - state.tlFullSbcSetRefreshAt < 60000;
      if (!refreshedRecently) {
        state.tlFullSbcSetRefreshAt = now;
        const loaded = await loadSbcSets({ force: missing.length > 0 && sets.length > 0 });
        if (loaded?.softban) {
          log('SBC titles were not loaded', { softban: true });
          return;
        }
        sets = loaded?.sets?.length ? loaded.sets : collectSbcSets();
      }
    }
    state.tlFullSbcSetList = sets;
    for (const setId of needed) {
      const set = findSbcSet(setId, sets);
      if (!set) {
        log('SBC set was not found for its title', { setId, knownSets: sets.length });
        continue;
      }
      if (!setNeedsChallengeTitle(set)) continue;
      if (typeof win.services?.SBC?.requestChallengesForSet !== 'function') break;
      await pace('move');
      const response = await awaitObservable(() => win.services.SBC.requestChallengesForSet(set));
      if (isSoftBanPayload(response)) {
        log('Stopped loading SBC titles', { setId: set.id, softban: true });
        break;
      }
      log('Loaded SBC title', {
        setId: set.id,
        name: sbcText(set.name || set._name),
        description: sbcText(set.description || set._description),
        challenge: sbcText(challengesOnSet(set)[0]?.name),
      });
    }
  }

  function optionFromTemplateRow(row) {
    const raw = String(row?.challengeId ?? '').trim();
    const setMatch = /^s(\d+)$/i.exec(raw);
    if (setMatch) {
      const setId = Number(setMatch[1]);
      const globalName = row.globalTemplateId
        ? state.tlFullSbcGlobalNames?.get(String(row.globalTemplateId))
        : '';
      return {
        id: `s${setId}`,
        label: globalName ? `${cachedSetLabel(setId)} (${globalName})` : cachedSetLabel(setId),
      };
    }
    const challengeId = Number(raw);
    if (!(challengeId > 0)) return null;
    const globalName = row.globalTemplateId
      ? state.tlFullSbcGlobalNames?.get(String(row.globalTemplateId))
      : '';
    const label = cachedSbcOptionLabel(challengeId);
    return {
      id: String(challengeId),
      label: globalName && label.startsWith('Challenge ') ? `${label} (${globalName})` : label,
    };
  }

  function cachedSetLabel(setId) {
    const set = findSbcSet(setId);
    if (!set) return `SBC set ${setId}`;
    const challenges = challengesOnSet(set);
    if (challenges.length === 1) return sbcOptionTitle(set, challenges[0]);
    return sbcOptionTitle(set, null);
  }

  function cachedSbcOptionLabel(challengeId) {
    const sets = iterCollection(win.repositories?.SBC?.getSets?.());
    for (const set of sets) {
      const challenge = challengeFromSet(set, challengeId);
      if (challenge) return sbcOptionTitle(set, challenge);
    }
    return `Challenge ${challengeId}`;
  }

  async function refreshTlFullSbcOptions() {
    if (state.tlFullSbcOptionsLoading) return;
    state.tlFullSbcOptionsLoading = true;
    try {
      const rows = await readSavedSbcTemplateRows();
      await ensureSbcTitlesLoaded(rows);
      await resolveOneClickTemplateNames();
      const byId = new Map();
      for (const row of rows) {
        const option = optionFromTemplateRow(row);
        if (!option || byId.has(option.id)) continue;
        byId.set(option.id, option);
      }
      const namedOneClick = new Map(
        listLoadedOneClickChallenges().map((row) => [String(row.challengeId), row.label])
      );
      for (const [id, saved] of Object.entries(readOneClickTemplates())) {
        if (!Array.isArray(saved?.steps) || !saved.steps.length) continue;
        const challengeId = Number(id);
        if (!(challengeId > 0) || byId.has(String(challengeId))) continue;
        const savedName = saved?.name && !isGenericSbcLabel(saved.name) ? saved.name : '';
        byId.set(String(challengeId), {
          id: String(challengeId),
          label:
            savedName ||
            namedOneClick.get(String(challengeId)) ||
            cachedSbcOptionLabel(challengeId),
        });
      }
      state.tlFullSbcOptions = [...byId.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
      log('Free-space SBC options', {
        count: state.tlFullSbcOptions.length,
        labels: state.tlFullSbcOptions.map((opt) => opt.label),
      });
    } catch (err) {
      warn('Free-space SBC option load failed', err);
      state.tlFullSbcOptions = state.tlFullSbcOptions || [];
    } finally {
      state.tlFullSbcOptionsLoading = false;
      renderTlFullSbcOptions();
    }
  }

  function renderTlFullSbcOptions() {
    const select = win.document.getElementById('companion-tl-full-sbc-select');
    if (!select) return;
    const options = state.tlFullSbcOptions || [];
    const selected = getTlFullSbcChoice()?.templateKey || '';
    const signature = `${selected || ''}|${options
      .map((opt) => `${opt.id}:${opt.label}`)
      .join('|')}`;
    if (select.dataset.signature === signature) {
      select.dataset.companionReady = '1';
      return;
    }
    select.dataset.signature = signature;
    select.innerHTML = '';
    const none = win.document.createElement('option');
    none.value = '';
    none.textContent = options.length ? 'None' : 'No saved templates found';
    select.appendChild(none);
    const known = new Set(options.map((opt) => opt.id));
    const list = options.slice();
    if (selected && !known.has(selected)) {
      const fallback = choiceFromTemplateKey(selected);
      list.unshift({
        id: selected,
        label: fallback?.setId
          ? cachedSetLabel(fallback.setId)
          : cachedSbcOptionLabel(fallback?.challengeId || selected),
      });
    }
    for (const opt of list) {
      const el = win.document.createElement('option');
      el.value = String(opt.id);
      el.textContent = opt.label;
      select.appendChild(el);
    }
    setSelectValue(select, selected ? String(selected) : '');
    select.dataset.companionReady = '1';
  }

  function syncTlFullSbcPicker(root) {
    const scope = root && root.querySelector ? root : win.document;
    const actionSelect = scope.querySelector(SELECTORS.transferListFull);
    const row = scope.querySelector('#companion-tl-full-sbc');
    if (!actionSelect || !row) return;
    const show = getRealSelectValue(actionSelect) === TL_FULL_FREE_SPACE;
    row.style.display = show ? '' : 'none';
  }

  function ensureTlFullSbcPicker(root) {
    const scope = root && root.querySelector ? root : win.document;
    const actionSelect = scope.querySelector(SELECTORS.transferListFull);
    if (!actionSelect) return;
    let row = scope.querySelector('#companion-tl-full-sbc');
    if (!row) {
      row = win.document.createElement('div');
      row.id = 'companion-tl-full-sbc';
      row.style.cssText = 'margin:8px 0 4px;';
      row.innerHTML = `
        <label for="companion-tl-full-sbc-select" style="display:block;margin-bottom:4px;">
          Free-space SBC
        </label>
        <select id="companion-tl-full-sbc-select" style="width:100%;max-width:100%;">
          <option value="">None</option>
        </select>
      `;
      const anchor = visibleAfter(actionSelect);
      anchor.insertAdjacentElement('afterend', row);
      row.querySelector('#companion-tl-full-sbc-select').addEventListener('change', () => {
        rememberTlFullSbcChoice(scope);
      });
    }
    syncTlFullSbcPicker(scope);
    const stale =
      !state.tlFullSbcOptionsAt || Date.now() - state.tlFullSbcOptionsAt > 15000;
    if (stale && !state.tlFullSbcOptionsLoading) {
      state.tlFullSbcOptionsAt = Date.now();
      refreshTlFullSbcOptions();
    } else {
      renderTlFullSbcOptions();
    }
  }

  function visibleAfter(node) {
    let current = node;
    while (current && current.parentElement) {
      const style = win.getComputedStyle(current);
      if (style.display !== 'none' && style.visibility !== 'hidden') return current;
      current = current.parentElement;
    }
    return node;
  }

  function ensureTransferListFullFreeSpaceOption(root) {
    const scope = root && root.querySelector ? root : win.document;
    const select = scope.querySelector(SELECTORS.transferListFull);
    if (!select) return;
    ensureCustomOption(select, TL_FULL_FREE_SPACE, 'Free space and continue');
    if (select.dataset.companionTlFullWired !== '1') {
      select.addEventListener('change', () => {
        rememberTransferListFullAction(select.parentElement || win.document);
        syncTlFullSbcPicker(scope);
        rememberTlFullSbcChoice(scope);
      });
      select.dataset.companionTlFullWired = '1';
    }
    ensureTlFullSbcPicker(scope);
  }

  /** @deprecated legacy custom options — pack rules panel replaces them */
  function ensureCustomOption(select, action, label) {
    if (!select) return;
    let option = select.querySelector(`option[value="${action}"]`);
    if (!option) {
      option = win.document.createElement('option');
      option.value = action;
      select.appendChild(option);
    }
    option.textContent = label;
  }

  function ensureSplitOption(select) {
    // Kept as no-op shim: facade + pack rules panel supersede custom options.
    if (select) forceSelectToQuickSellFacade(select);
  }

  function refreshCompanionActionLabels() {
    forceNativePackCategorySelectsToFacade();
  }

  function syncSelectFromStorage(select) {
    // Pack rules own disposition; keep native selects on quickSell facade.
    forceSelectToQuickSellFacade(select);
  }

  function wireSelect(select, key) {
    if (!select || select.dataset.companionWired === '1') return;
    forceSelectToQuickSellFacade(select);
    select.addEventListener('change', () => {
      // Re-assert facade if Paletools/user changes the hidden select
      forceSelectToQuickSellFacade(select);
      if (key) setSavedActions({ [key]: FACADE_ACTION });
    });
    select.dataset.companionWired = '1';
  }

  function packActionSelectHtml(selectId, selectedValue, { forDuplicate = false } = {}) {
    const optionsList = forDuplicate
      ? PACK_ACTION_OPTIONS_DUPLICATE
      : PACK_ACTION_OPTIONS;
    const selected = forDuplicate
      ? coerceDuplicatePackAction(selectedValue)
      : isPackAction(selectedValue)
        ? selectedValue
        : PACK_ACTION.QUICK_SELL;
    const options = optionsList
      .map(
        (opt) =>
          `<option value="${opt.value}"${
            opt.value === selected ? ' selected' : ''
          }>${opt.label}</option>`
      )
      .join('');
    return `<select id="${selectId}" data-pack-action="1" style="width:100%;max-width:100%;padding:3px 4px;font-size:11px;">${options}</select>`;
  }

  function buildPlayerManagerRulesMatrix({
    title,
    groupKey,
    importantCol,
    otherCol,
    prefix,
  }) {
    const rules = getPackRules();
    const group = rules[groupKey];
    const wrap = win.document.createElement('div');
    wrap.style.cssText = 'margin:10px 0 14px;';
    wrap.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;color:#4ee6eb;">${title}</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 2px;opacity:0.8;"></th>
            <th style="text-align:left;padding:4px 2px;">${importantCol}</th>
            <th style="text-align:left;padding:4px 2px;">${otherCol}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:4px 2px;font-weight:600;">New</td>
            <td style="padding:4px 2px;">${packActionSelectHtml(
              `${prefix}-newImportant`,
              group.newImportant
            )}</td>
            <td style="padding:4px 2px;">${packActionSelectHtml(
              `${prefix}-newOther`,
              group.newOther
            )}</td>
          </tr>
          <tr>
            <td style="padding:4px 2px;font-weight:600;">Duplicate</td>
            <td style="padding:4px 2px;">${packActionSelectHtml(
              `${prefix}-dupImportant`,
              group.dupImportant,
              { forDuplicate: true }
            )}</td>
            <td style="padding:4px 2px;">${packActionSelectHtml(
              `${prefix}-dupOther`,
              group.dupOther,
              { forDuplicate: true }
            )}</td>
          </tr>
        </tbody>
      </table>
    `;
    for (const key of [
      'newImportant',
      'newOther',
      'dupImportant',
      'dupOther',
    ]) {
      const select = wrap.querySelector(`#${prefix}-${key}`);
      if (!select) continue;
      select.addEventListener('change', () => {
        patchPackRules({ [groupKey]: { [key]: select.value } });
        log('Saved pack rule', groupKey, key, select.value);
      });
    }
    return wrap;
  }

  function buildVanityRulesMatrix({ prefix }) {
    const wrap = win.document.createElement('div');
    wrap.style.cssText = 'margin:10px 0 8px;';
    const render = () => {
      const rules = getPackRules();
      const selected = new Set(rules.vanityIndividual || []);
      const sections = VANITY_GROUPS.map((group) => {
        const checkedItems = group.items.filter((item) => selected.has(item.id));
        const checks = group.items
          .map((item) => {
            const checked = selected.has(item.id) ? ' checked' : '';
            return `<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;">
          <input type="checkbox" id="${prefix}-vanity-individual-${item.id}" data-vanity-kind="${item.id}"${checked}>
          ${item.label}
        </label>`;
          })
          .join('');
        const shared = rules.vanityGroups[group.id];
        const sharedLabel = checkedItems.length ? `Other ${group.label}` : `All ${group.label}`;
        const sharedRow = `
        <tr>
          <td style="padding:4px 2px;font-weight:600;">${sharedLabel}</td>
          <td style="padding:4px 2px;">${packActionSelectHtml(
            `${prefix}-vanity-${group.id}-shared-new`,
            shared.new
          )}</td>
          <td style="padding:4px 2px;">${packActionSelectHtml(
            `${prefix}-vanity-${group.id}-shared-duplicate`,
            shared.duplicate,
            { forDuplicate: true }
          )}</td>
        </tr>`;
        const rows = checkedItems
          .map((item) => {
            const row = rules.vanity[item.id];
            return `
        <tr>
          <td style="padding:4px 2px;font-weight:600;">${item.label}</td>
          <td style="padding:4px 2px;">${packActionSelectHtml(
            `${prefix}-vanity-${item.id}-new`,
            row.new
          )}</td>
          <td style="padding:4px 2px;">${packActionSelectHtml(
            `${prefix}-vanity-${item.id}-duplicate`,
            row.duplicate,
            { forDuplicate: true }
          )}</td>
        </tr>`;
          })
          .join('');
        return `
        <div style="margin:0 0 12px;">
          <div style="font-weight:700;margin-bottom:4px;color:#4ee6eb;">${group.label}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:6px;">${checks}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:4px 2px;opacity:0.8;">Type</th>
                <th style="text-align:left;padding:4px 2px;">New</th>
                <th style="text-align:left;padding:4px 2px;">Duplicate</th>
              </tr>
            </thead>
            <tbody>${sharedRow}${rows}</tbody>
          </table>
        </div>`;
      }).join('');
      wrap.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;color:#4ee6eb;">Item handling</div>
      <div style="opacity:0.75;font-size:11px;margin-bottom:8px;line-height:1.35;">
        Each group shares one action. Check an item to handle it separately from the rest of its group.
      </div>
      ${sections}
    `;
      for (const item of vanityCatalogItems()) {
        const box = wrap.querySelector(`#${prefix}-vanity-individual-${item.id}`);
        if (!box) continue;
        box.addEventListener('change', () => {
          const current = new Set(getPackRules().vanityIndividual || []);
          if (box.checked) current.add(item.id);
          else current.delete(item.id);
          patchPackRules({ vanityIndividual: [...current] });
          log('Saved vanity individual types', [...current]);
          render();
        });
      }
      for (const group of VANITY_GROUPS) {
        for (const slot of ['new', 'duplicate']) {
          const select = wrap.querySelector(
            `#${prefix}-vanity-${group.id}-shared-${slot}`
          );
          if (!select) continue;
          select.addEventListener('change', () => {
            patchPackRules({ vanityGroups: { [group.id]: { [slot]: select.value } } });
            log('Saved vanity group rule', group.id, slot, select.value);
          });
        }
      }
      for (const kind of selected) {
        for (const slot of ['new', 'duplicate']) {
          const select = wrap.querySelector(`#${prefix}-vanity-${kind}-${slot}`);
          if (!select) continue;
          select.addEventListener('change', () => {
            patchPackRules({ vanity: { [kind]: { [slot]: select.value } } });
            log('Saved vanity pack rule', kind, slot, select.value);
          });
        }
      }
    };
    render();
    return wrap;
  }

  function buildPackRulesPanel({ id, undercutInputId, showImportantListsHint = false }) {
    const panel = win.document.createElement('div');
    panel.id = id;
    panel.style.cssText = [
      'margin:12px 0',
      'padding:10px',
      'border:1px solid rgba(78,230,235,0.45)',
      'border-radius:4px',
      'background:rgba(0,0,0,0.25)',
    ].join(';');

    const title = win.document.createElement('div');
    title.style.cssText =
      'font-weight:700;margin-bottom:8px;color:#4ee6eb;font-size:13px;';
    title.textContent = 'Companion pack rules';
    panel.appendChild(title);

    const help = win.document.createElement('div');
    help.style.cssText =
      'opacity:0.75;font-size:11px;margin-bottom:10px;line-height:1.35;';
    help.innerHTML =
      'Replaces Paletools Players / Managers / Items prompts. Currency, pack count, speed, and Transfer list full stay native. Dig+list failures go to the transfer list unlisted.' +
      (showImportantListsHint
        ? '<br><br>Edit <b>Players</b> and <b>Managers</b> in Companion settings. Each tab has its own league list and nation list. A card is important when its league or its nation is selected there.'
        : ' Use the Players / Managers tabs. Each has its own league list and nation list. A card is important when its league or its nation is selected there.');
    panel.appendChild(help);

    panel.appendChild(buildUndercutSettingEditor({ inputId: undercutInputId }));

    panel.appendChild(
      buildPlayerManagerRulesMatrix({
        title: 'Players',
        groupKey: 'players',
        importantCol: 'Important',
        otherCol: 'Other',
        prefix: `${id}-players`,
      })
    );

    panel.appendChild(
      buildPlayerManagerRulesMatrix({
        title: 'Managers',
        groupKey: 'managers',
        importantCol: 'Important',
        otherCol: 'Other',
        prefix: `${id}-managers`,
      })
    );

    panel.appendChild(buildVanityRulesMatrix({ prefix: id }));
    return panel;
  }

  function coerceToArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') {
      if (typeof raw.values === 'function') {
        try {
          return [...raw.values()];
        } catch {
          /* fall through */
        }
      }
      if (typeof raw.length === 'number') {
        try {
          return Array.from(raw);
        } catch {
          /* fall through */
        }
      }
      return Object.values(raw);
    }
    return [];
  }

  /** Big leagues, then the next tier. Matched on the web app's league abbreviation. */
  const COMMON_LEAGUE_ABBREVIATIONS = [
    'ENG 1',
    'ESP 1',
    'ITA 1',
    'GER 1',
    'FRA 1',
    'ENG 2',
    'NED 1',
    'POR 1',
    'BEL 1',
    'TUR 1',
    'SCO 1',
    'USA 1',
    'SAU 1',
    'MEX 1',
    'BRA 1',
    'ARG 1',
    'ENG W',
    'ESP W',
    'ITA W',
    'GER W',
    'FRA W',
    'ENG W1',
    'ESP W1',
    'ITA W1',
    'GER W1',
    'FRA W1',
  ];
  /** Classic ids used when the abbreviation is not on the option yet. */
  const COMMON_LEAGUE_IDS = [13, 53, 31, 19, 16];
  /**
   * England, France, Spain, Germany, Italy, Brazil, Argentina, Portugal,
   * Netherlands, Belgium, Croatia, Uruguay. The game's TOP_NINE_NATIONS
   * list is prepended when it exists.
   */
  const COMMON_NATION_IDS = [14, 18, 45, 21, 27, 54, 52, 38, 34, 7, 10, 50];

  function commonNationOrder() {
    const fromGame = Array.isArray(win.TOP_NINE_NATIONS)
      ? win.TOP_NINE_NATIONS.map((id) => Number(id))
      : [];
    const order = [];
    const seen = new Set();
    for (const id of [...fromGame, ...COMMON_NATION_IDS]) {
      if (!Number.isFinite(id) || id < 0 || seen.has(id)) continue;
      seen.add(id);
      order.push(id);
    }
    return order;
  }

  function leagueAbbreviationMap() {
    const byId = new Map();
    try {
      const leagues = iterCollection(win.repositories?.TeamConfig?.getLeagues?.());
      for (const league of leagues) {
        const id = Number(league?.id ?? league?.leagueId);
        const abbreviation = String(league?.abbreviation || '').trim().toUpperCase();
        if (!Number.isFinite(id) || id < 0 || !abbreviation) continue;
        byId.set(id, abbreviation);
      }
    } catch {
      /* ignore */
    }
    return byId;
  }

  function abbreviationFromLabel(label) {
    const match = /\(([A-Za-z0-9 ]+)\)\s*$/.exec(String(label || ''));
    return match ? match[1].trim().toUpperCase() : '';
  }

  function sortWithPriority(entries, priorityOf) {
    return entries.slice().sort((a, b) => {
      const aRank = priorityOf(a);
      const bRank = priorityOf(b);
      const aPinned = aRank >= 0;
      const bPinned = bRank >= 0;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      if (aPinned && aRank !== bRank) return aRank - bRank;
      return a.label.localeCompare(b.label);
    });
  }

  function localizeNationName(id) {
    try {
      const loc = win.services?.Localization;
      if (!loc) return null;
      const key = `search.nationName.nation${id}`;
      const localize =
        (typeof loc.localize === 'function' && loc.localize.bind(loc)) ||
        (typeof loc.getString === 'function' && loc.getString.bind(loc)) ||
        null;
      if (!localize) return null;
      const name = localize(key);
      if (!name || typeof name !== 'string') return null;
      const trimmed = name.trim();
      // EA marks missing keys with a leading '*'
      if (!trimmed || trimmed.startsWith('*') || trimmed === key) return null;
      return trimmed;
    } catch {
      return null;
    }
  }

  function normalizeNationEntry(entry) {
    if (entry == null) return null;
    if (typeof entry === 'number' || typeof entry === 'string') {
      const id = Number(entry);
      if (Number.isNaN(id) || id < 0) return null;
      return { id, label: localizeNationName(id) || String(id) };
    }
    const id = Number(
      entry.id ?? entry.value ?? entry.nationId ?? entry.ID ?? entry.key
    );
    if (Number.isNaN(id) || id < 0) return null;
    const label =
      entry.label ||
      entry.name ||
      entry.text ||
      entry.displayName ||
      localizeNationName(id) ||
      String(id);
    return { id, label: String(label) };
  }

  function getNationsFromDataProvider() {
    try {
      const dp = win.factories?.DataProvider?.getNationDP?.();
      return coerceToArray(dp)
        .map(normalizeNationEntry)
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function getNationsFromLocalizationScan() {
    // Fallback: probe EA locale keys for the full nation catalog
    const found = [];
    for (let id = 1; id <= 300; id++) {
      const label = localizeNationName(id);
      if (label) found.push({ id, label });
    }
    return found;
  }

  function getNationOptions() {
    const byId = new Map();

    for (const nation of getNationsFromDataProvider()) {
      byId.set(nation.id, nation);
    }

    // getNationDP is sometimes a short/popular subset; fill from locale keys
    if (byId.size < 30) {
      for (const nation of getNationsFromLocalizationScan()) {
        if (!byId.has(nation.id)) byId.set(nation.id, nation);
      }
    }

    const nationOrder = commonNationOrder();
    return sortWithPriority([...byId.values()], (entry) => nationOrder.indexOf(entry.id));
  }

  function localizeLeagueName(id) {
    try {
      const loc = win.services?.Localization;
      if (!loc) return null;
      const key = `search.leagueName.league${id}`;
      const localize =
        (typeof loc.localize === 'function' && loc.localize.bind(loc)) ||
        (typeof loc.getString === 'function' && loc.getString.bind(loc)) ||
        null;
      if (!localize) return null;
      const name = localize(key);
      if (!name || typeof name !== 'string') return null;
      const trimmed = name.trim();
      if (!trimmed || trimmed.startsWith('*') || trimmed === key) return null;
      return trimmed;
    } catch {
      return null;
    }
  }

  function getLeagueOptions() {
    const byId = new Map();
    try {
      const dp = win.factories?.DataProvider?.getLeagueDP?.(true) ||
        win.factories?.DataProvider?.getLeagueDP?.(0) ||
        win.factories?.DataProvider?.getLeagueDP?.();
      for (const entry of coerceToArray(dp)) {
        const id = Number(entry.id ?? entry.value ?? entry.leagueId);
        if (Number.isNaN(id) || id < 0) continue;
        const label =
          entry.label ||
          entry.name ||
          entry.text ||
          localizeLeagueName(id) ||
          String(id);
        if (String(label).includes('*')) continue;
        byId.set(id, { id, label: String(label) });
      }
    } catch {
      /* ignore */
    }

    if (byId.size < 20) {
      for (let id = 1; id <= 300; id++) {
        if (byId.has(id)) continue;
        const label = localizeLeagueName(id);
        if (label) byId.set(id, { id, label });
      }
    }

    const abbreviations = leagueAbbreviationMap();
    return sortWithPriority([...byId.values()], (entry) => {
      const abbreviation =
        abbreviations.get(entry.id) || abbreviationFromLabel(entry.label);
      const byAbbreviation = COMMON_LEAGUE_ABBREVIATIONS.indexOf(abbreviation);
      if (byAbbreviation >= 0) return byAbbreviation;
      const byIdRank = COMMON_LEAGUE_IDS.indexOf(entry.id);
      if (byIdRank >= 0) return COMMON_LEAGUE_ABBREVIATIONS.length + byIdRank;
      return -1;
    });
  }

  function buildCheckboxListEditor({
    filterId,
    listId,
    countId,
    totalId,
    compact,
    helpText,
    title,
    noun,
    getSelectedIds,
    setSelectedIds,
    loadOptions,
    extraSelections,
  }) {
    const selected = getSelectedIds();
    const extras = (extraSelections || []).map((column) => ({
      label: column.label,
      title: column.title,
      selected: column.getSelectedIds(),
      setSelectedIds: column.setSelectedIds,
    }));
    let options = loadOptions();
    const wrap = win.document.createElement('div');
    wrap.className = 'companion-checkbox-list-editor';
    const listMax = compact ? 220 : 360;
    const btnStyle =
      'cursor:pointer;font-size:11px;padding:3px 8px;margin:0;';
    wrap.innerHTML = `
      ${
        title
          ? `<div style="font-weight:700;margin:14px 0 6px;color:#4ee6eb;">${title}</div>`
          : ''
      }
      <div style="opacity:0.85;margin-bottom:8px;font-size:12px;line-height:1.4;">
        ${helpText}
      </div>`;

    // Continue building via the rest of the former nations editor structure
    const rest = win.document.createElement('div');
    rest.innerHTML = `
      <input id="${filterId}" type="search" placeholder="Filter ${noun}..."
        style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:4px 6px;" />
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
        <button type="button" id="${listId}-select-all" style="${btnStyle}">Select all</button>
        <button type="button" id="${listId}-deselect-all" style="${btnStyle}">Deselect all</button>
        <button type="button" id="${listId}-reload" style="${btnStyle}">Reload list</button>
      </div>
      <div id="${listId}"
        style="width:100%;box-sizing:border-box;height:${listMax}px;max-height:${listMax}px;overflow-x:hidden;overflow-y:scroll;overscroll-behavior:contain;border:1px solid rgba(255,255,255,0.2);padding:6px;background:rgba(0,0,0,0.2);-webkit-overflow-scrolling:touch;"></div>
      <div style="margin-top:6px;opacity:0.8;font-size:12px;">
        <span id="${countId}"></span>
        <span id="${totalId}">${options.length}</span> ${noun} listed
      </div>
    `;
    wrap.appendChild(rest);

    const list = wrap.querySelector(`#${listId}`);
    const filter = wrap.querySelector(`#${filterId}`);
    const count = wrap.querySelector(`#${countId}`);
    const total = wrap.querySelector(`#${totalId}`);
    const reloadBtn = wrap.querySelector(`#${listId}-reload`);
    const selectAllBtn = wrap.querySelector(`#${listId}-select-all`);
    const deselectAllBtn = wrap.querySelector(`#${listId}-deselect-all`);
    if (extras.length) {
      selectAllBtn.title = 'Check Pack Opener for the visible rows';
      deselectAllBtn.title = 'Clear Pack Opener for the visible rows';
    }

    function selectionSummary() {
      if (!extras.length) return `${selected.size} selected · `;
      const extraText = extras
        .map((column) => `${column.selected.size} ${column.label}`)
        .join(' · ');
      return `${selected.size} Pack · ${extraText} · `;
    }

    function persistSelection() {
      setSelectedIds([...selected]);
      for (const column of extras) column.setSelectedIds([...column.selected]);
      count.textContent = selectionSummary();
    }

    function getVisible(filterText = filter.value) {
      const q = filterText.trim().toLowerCase();
      if (!q) return options.slice();
      return options.filter(
        (entry) =>
          entry.label.toLowerCase().includes(q) ||
          String(entry.id).includes(q)
      );
    }

    function renderOptions(filterText = '') {
      const visible = getVisible(filterText);
      list.innerHTML = '';
      total.textContent = String(options.length);
      count.textContent = selectionSummary();

      if (!options.length) {
        const empty = win.document.createElement('div');
        empty.style.cssText = 'opacity:0.8;font-size:12px;padding:4px;';
        empty.textContent = `${noun} list unavailable yet — browse the web app once, then click Reload list`;
        list.appendChild(empty);
        return;
      }

      if (!visible.length) {
        const empty = win.document.createElement('div');
        empty.style.cssText = 'opacity:0.8;font-size:12px;padding:4px;';
        empty.textContent = `No ${noun} match this filter.`;
        list.appendChild(empty);
        return;
      }

      if (extras.length) {
        const header = win.document.createElement('div');
        header.style.cssText =
          'display:flex;align-items:center;gap:8px;padding:0 2px 4px;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.7;';
        const packHead = win.document.createElement('span');
        packHead.textContent = 'Pack';
        packHead.title = 'Pack Opener';
        packHead.style.cssText = 'width:32px;text-align:center;flex:0 0 32px;';
        header.appendChild(packHead);
        for (const column of extras) {
          const head = win.document.createElement('span');
          head.textContent = column.label;
          head.title = column.title || column.label;
          head.style.cssText = 'width:32px;text-align:center;flex:0 0 32px;';
          header.appendChild(head);
        }
        list.appendChild(header);
      }

      for (const entry of visible) {
        const row = win.document.createElement(extras.length ? 'div' : 'label');
        row.style.cssText = [
          'display:flex',
          'align-items:center',
          'gap:8px',
          'padding:4px 2px',
          'font-size:12px',
          'user-select:none',
          extras.length ? '' : 'cursor:pointer',
        ]
          .filter(Boolean)
          .join(';');

        const columns = [
          {
            selected,
            title: 'Pack Opener',
          },
          ...extras.map((column) => ({
            selected: column.selected,
            title: column.title || column.label,
          })),
        ];
        for (const column of columns) {
          const checkbox = win.document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.title = column.title;
          checkbox.checked = column.selected.has(entry.id);
          checkbox.style.cssText = 'margin:0;';
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) column.selected.add(entry.id);
            else column.selected.delete(entry.id);
            persistSelection();
          });
          if (extras.length) {
            const cell = win.document.createElement('span');
            cell.style.cssText =
              'width:32px;flex:0 0 32px;display:flex;justify-content:center;';
            cell.appendChild(checkbox);
            row.appendChild(cell);
          } else {
            row.appendChild(checkbox);
          }
        }

        const text = win.document.createElement('span');
        text.textContent = `${entry.label} (${entry.id})`;
        row.appendChild(text);
        list.appendChild(row);
      }
    }

    list.addEventListener(
      'wheel',
      (event) => {
        event.stopPropagation();
      },
      { passive: true }
    );

    filter.addEventListener('input', () => renderOptions(filter.value));
    selectAllBtn.addEventListener('click', () => {
      for (const entry of getVisible()) selected.add(entry.id);
      persistSelection();
      renderOptions(filter.value);
    });
    deselectAllBtn.addEventListener('click', () => {
      const visible = new Set(getVisible().map((entry) => entry.id));
      if (!filter.value.trim()) selected.clear();
      else {
        for (const id of [...selected]) {
          if (visible.has(id)) selected.delete(id);
        }
      }
      persistSelection();
      renderOptions(filter.value);
    });
    reloadBtn.addEventListener('click', () => {
      options = loadOptions();
      renderOptions(filter.value);
    });
    renderOptions();
    return wrap;
  }

  function buildNationsEditor({
    filterId,
    listId,
    countId,
    totalId,
    compact,
    audience = 'managers',
  }) {
    const forPlayers = audience === 'players';
    return buildCheckboxListEditor({
      filterId,
      listId,
      countId,
      totalId,
      compact,
      title: 'Nations',
      noun: 'nations',
      helpText: forPlayers
        ? 'Pack marks the nation for Pack Opener. SBC is used only when the template step has Not Important Nations Only on: a duplicate can still be used, and the only club copy stays in the club.'
        : 'Managers from these nations use the Managers Important column, even when their league is not selected.',
      getSelectedIds: forPlayers ? getPlayerNationIds : getImportantNationIds,
      setSelectedIds: forPlayers ? setPlayerNationIds : setImportantNationIds,
      loadOptions: getNationOptions,
      extraSelections: forPlayers
        ? [
            {
              label: 'SBC',
              title:
                'Used when the template has Not Important Nations Only on. Duplicates can be used; the only club copy stays in the club.',
              getSelectedIds: getPlayerSbcNationIds,
              setSelectedIds: setPlayerSbcNationIds,
            },
          ]
        : null,
    });
  }

  function buildLeaguesEditor({
    filterId,
    listId,
    countId,
    totalId,
    compact,
    audience = 'players',
  }) {
    const forManagers = audience === 'managers';
    return buildCheckboxListEditor({
      filterId,
      listId,
      countId,
      totalId,
      compact,
      title: 'Leagues',
      noun: 'leagues',
      helpText: forManagers
        ? 'Managers from these leagues use the Managers Important column, even when their nation is not selected.'
        : 'Pack marks the league for Pack Opener. SBC is used only when the template step has Not Important Leagues Only on: a duplicate can still be used, and the only club copy stays in the club.',
      getSelectedIds: forManagers ? getManagerLeagueIds : getImportantLeagueIds,
      setSelectedIds: forManagers ? setManagerLeagueIds : setImportantLeagueIds,
      loadOptions: getLeagueOptions,
      extraSelections: forManagers
        ? null
        : [
            {
              label: 'SBC',
              title:
                'Used when the template has Not Important Leagues Only on. Duplicates can be used; the only club copy stays in the club.',
              getSelectedIds: getPlayerSbcLeagueIds,
              setSelectedIds: setPlayerSbcLeagueIds,
            },
          ],
    });
  }

  function buildClubFloorSettingEditor({ inputId }) {
    const wrap = win.document.createElement('div');
    wrap.style.cssText = 'margin:0 0 12px;';
    const n = getClubFloorListingsToQs();
    wrap.innerHTML = `
      <label for="${inputId}" style="display:block;font-weight:700;margin-bottom:4px;color:#4ee6eb;">
        Club scan: QS if listings at min BIN exceed
      </label>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <input id="${inputId}" type="number" min="1" max="${MAX_CLUB_FLOOR_LISTINGS_TO_QS}" step="1" value="${n}"
          style="width:72px;padding:4px 6px;" />
      </div>
      <div style="opacity:0.75;font-size:11px;margin-top:4px;line-height:1.35;">
        In Club/Stadium, filter a list (e.g. bronze badges), then use <b>Scan club list</b> (bottom-left).
        Untradeables are quick-sold. Tradeables with more than this many listings at the minimum BIN are quick-sold.
        Thin floors, above-min prices, and no market data are kept.
      </div>
      <button type="button" id="${inputId}-scan" style="margin-top:8px;padding:6px 10px;cursor:pointer;">
        Scan current club list now
      </button>
    `;
    const input = wrap.querySelector(`#${inputId}`);
    input.addEventListener('change', () => {
      setClubFloorListingsToQs(input.value);
      input.value = String(getClubFloorListingsToQs());
    });
    wrap.querySelector(`#${inputId}-scan`).addEventListener('click', () => {
      win.document.getElementById('companion-settings-modal')?.remove();
      startClubValueScan();
    });
    return wrap;
  }

  function buildUndercutSettingEditor({ inputId }) {
    const wrap = win.document.createElement('div');
    wrap.style.cssText = 'margin:0 0 12px;';
    const n = getMinUndercuts();
    wrap.innerHTML = `
      <label for="${inputId}" style="display:block;font-weight:700;margin-bottom:4px;color:#4ee6eb;">
        Min cheaper listings (undercuts)
      </label>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <input id="${inputId}" type="number" min="0" max="${MAX_MIN_UNDERCUTS}" step="1" value="${n}"
          style="width:72px;padding:4px 6px;" />
        <span id="${inputId}-hint" style="opacity:0.85;font-size:12px;"></span>
      </div>
      <div style="opacity:0.75;font-size:11px;margin-top:4px;line-height:1.35;">
        0 = list at the current lowest BIN. 1+ = require that many cheaper listings below your BIN before listing.
      </div>
    `;
    const input = wrap.querySelector(`#${inputId}`);
    const hint = wrap.querySelector(`#${inputId}-hint`);
    const syncHint = () => {
      hint.textContent = undercutSettingLabel(getMinUndercuts());
    };
    syncHint();
    input.addEventListener('change', () => {
      const next = setMinUndercuts(input.value);
      input.value = String(next);
      syncHint();
      refreshCompanionActionLabels();
      log('Saved minUndercuts', next);
    });
    return wrap;
  }

  function withCompanionDomWrite(fn) {
    state.companionDomWrite = true;
    try {
      return fn();
    } finally {
      // Keep the flag through the observer's microtask delivery of our own mutations
      win.setTimeout(() => {
        state.companionDomWrite = false;
      }, 0);
    }
  }

  // ---------------------------------------------------------------------------
  // Pack Opener templates. A template is the pack plus the dialog settings.
  // League and nation checklists stay global Companion settings.
  // ---------------------------------------------------------------------------

  function readPackOpenerTemplates() {
    const saved = readJson(STORAGE_PACK_OPENER_TEMPLATES, []);
    if (!Array.isArray(saved)) return [];
    return saved.filter((entry) => entry && typeof entry.name === 'string' && entry.id);
  }

  function writePackOpenerTemplates(templates) {
    writeJson(STORAGE_PACK_OPENER_TEMPLATES, templates);
  }

  function newPackTemplateId() {
    return `t${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cssEscape(value) {
    const text = String(value ?? '');
    if (win.CSS && typeof win.CSS.escape === 'function') return win.CSS.escape(text);
    return text.replace(/["\\]/g, '\\$&');
  }

  function snapshotNativePackFields(dialog) {
    const skip = new Set(
      NATIVE_PACK_CATEGORY_SELECTORS.map((selector) => selector.replace(/^#/, ''))
    );
    const fields = [];
    for (const el of dialog.querySelectorAll('input, select, textarea')) {
      if (!el.id || skip.has(el.id)) continue;
      if (
        el.closest(
          '#companion-pack-rules, #companion-tl-full-sbc, #companion-pack-template-save-row'
        )
      ) {
        continue;
      }
      fields.push({
        id: el.id,
        tag: el.tagName,
        type: el.type || '',
        value: el.value,
        checked: !!el.checked,
      });
    }
    return fields;
  }

  function readDialogPackCount(dialog) {
    const input = dialog.querySelector(
      '#pack-opener-purchase-count .ut-number-input-control'
    );
    const n = Math.floor(Number(String(input?.value || '').replace(/[^\d-]/g, '')));
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }

  function applyNativePackFields(dialog, fields) {
    const skipFull = 'pack-opener-transfer-list-full-purchase-action';
    for (const field of fields || []) {
      if (!field?.id || field.id === skipFull) continue;
      if (NATIVE_PACK_CATEGORY_SELECTORS.includes(`#${field.id}`)) continue;
      const el = dialog.querySelector(`#${cssEscape(field.id)}`);
      if (!el) continue;
      if (el.tagName === 'SELECT') {
        setSelectValue(el, String(field.value ?? ''));
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = !!field.checked;
      } else {
        el.value = field.value == null ? '' : String(field.value);
      }
    }
  }

  function setDialogPackCount(dialog, count) {
    const input = dialog.querySelector(
      '#pack-opener-purchase-count .ut-number-input-control'
    );
    if (!input) return false;
    let next = Math.floor(Number(count));
    if (!Number.isFinite(next) || next < 1) next = 1;
    const max = Math.floor(Number(input.max));
    if (Number.isFinite(max) && max >= 1) next = Math.min(next, max);
    input.value = String(next);
    return true;
  }

  function parseTemplateRunCount(value) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 1) return null;
    return n;
  }

  function collectStorePackViews() {
    const packs = [];
    walkViewControllers((controller) => {
      let view = null;
      try {
        view = typeof controller.getView === 'function' ? controller.getView() : null;
      } catch {
        view = null;
      }
      const list = view?.storePacks;
      if (!Array.isArray(list)) return;
      for (const packView of list) {
        if (packView) packs.push(packView);
      }
    });
    return packs;
  }

  function readPackFromCard(card) {
    if (!card) return null;
    let articleId = '';
    let name = '';
    for (const packView of collectStorePackViews()) {
      let root = null;
      try {
        root = packView.getRootElement?.();
      } catch {
        root = null;
      }
      if (root !== card) continue;
      const id = packView.articleId ?? packView.getArticleId?.();
      if (id != null && String(id) !== '') articleId = String(id);
      name = String(packView.__articleTitle?.textContent || '').trim();
      break;
    }
    const domId = String(card.dataset.id || '').trim();
    if (!articleId) articleId = domId;
    if (!name) {
      name = String(
        card.dataset.title ||
          card.querySelector('.ut-store-pack-details-view--title')?.textContent ||
          ''
      ).trim();
    }
    if (!articleId && !name) return null;
    const tradeRaw = card.dataset.tradeable;
    return {
      id: articleId,
      domId: domId || articleId,
      name: name || 'Pack',
      tradeable: tradeRaw === 'true' ? true : tradeRaw === 'false' ? false : null,
    };
  }

  function packOpenerLaunchButton(target) {
    if (!(target instanceof win.Element)) return null;
    const marked = target.closest('.pack-opener');
    if (marked) return marked;
    const card = target.closest('.ut-store-pack-details-view');
    if (!card) return null;
    const button = target.closest('button, .btn-standard');
    if (!button || !card.contains(button)) return null;
    const label = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!label.includes('open pack')) return null;
    return button;
  }

  function findPackCard(pack) {
    if (!pack?.id && !pack?.domId) return null;
    const wantId = String(pack.id || '');
    const wantDom = String(pack.domId || '');
    const matches = [];
    for (const packView of collectStorePackViews()) {
      const id = String(packView.articleId ?? packView.getArticleId?.() ?? '');
      let root = null;
      try {
        root = packView.getRootElement?.();
      } catch {
        root = null;
      }
      if (!root) continue;
      const domId = String(root.dataset.id || '');
      const idMatch = (wantId && (id === wantId || domId === wantId)) ||
        (wantDom && (domId === wantDom || id === wantDom));
      if (!idMatch) continue;
      if (pack.tradeable === true || pack.tradeable === false) {
        if (root.dataset.tradeable === 'true' || root.dataset.tradeable === 'false') {
          if ((root.dataset.tradeable === 'true') !== pack.tradeable) continue;
        }
      }
      matches.push(root);
    }
    const visible = matches.find((el) => el.getClientRects().length > 0);
    if (visible) return visible;
    if (matches[0]) return matches[0];
    if (!wantDom && !wantId) return null;
    const token = cssEscape(wantDom || wantId);
    return win.document.querySelector(`.ut-store-pack-details-view[data-id="${token}"]`);
  }

  async function waitForValue(read, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const value = read();
      if (value) return value;
      await sleep(150);
    }
    return null;
  }

  function iterableValues(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      if (typeof value.values === 'function') return [...value.values()];
    } catch {
      /* ignore */
    }
    return [];
  }

  function lookupStoreArticle(model, pack) {
    if (!model || !pack?.id) return null;
    const numeric = Number(pack.id);
    const keys = Number.isFinite(numeric) ? [numeric, String(numeric)] : [pack.id];
    const sameId = (entry) =>
      !!entry && keys.some((key) => entry.id === key || String(entry.id) === String(key));
    try {
      const table = model.articles;
      if (table && typeof table.get === 'function') {
        for (const key of keys) {
          const found = table.get(key);
          if (found) return found;
        }
      }
    } catch {
      /* ignore */
    }
    const fromArticles = iterableValues(model.articles).find(sameId);
    if (fromArticles) return fromArticles;
    return iterableValues(model.myPacks).find(sameId) || null;
  }

  function categoryForArticle(article) {
    const groups = win.PurchaseDisplayGroup;
    if (article?.isMyPack && groups && groups.MYPACKS != null) return groups.MYPACKS;
    if (article?.categoryId != null) return article.categoryId;
    return null;
  }

  function findStorePackController() {
    let fallback = null;
    let visible = null;
    walkViewControllers((controller) => {
      try {
        if (
          !(
            win.UTStorePackViewController &&
            controller instanceof win.UTStorePackViewController
          )
        ) {
          return;
        }
        const root = controller.getView?.()?.getRootElement?.();
        if (root && win.document.contains(root)) visible = controller;
        else if (!fallback) fallback = controller;
      } catch {
        /* not this controller */
      }
    });
    return visible || fallback;
  }

  function showArticleCategory(controller, article) {
    const category = categoryForArticle(article);
    if (category == null || typeof controller.setCategory !== 'function') return false;
    const current = controller.getView?.()?.getStoreCategory?.();
    if (current === category) return false;
    controller.setCategory(category);
    log('Pack template switched store tab', {
      category,
      packId: article?.id,
      myPack: !!article?.isMyPack,
    });
    return true;
  }

  async function waitForSavedPackCard(pack) {
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const controller = findStorePackController();
      const model = controller?.viewmodel;
      if (controller && model && !controller.packLoadObservable) {
        const article = lookupStoreArticle(model, pack);
        if (!article) {
          log('Pack template article missing', { id: pack.id, name: pack.name });
          return null;
        }
        const tabsReady = Array.isArray(model.categories) && model.categories.length > 0;
        if (tabsReady) {
          try {
            showArticleCategory(controller, article);
          } catch (err) {
            log('Pack template tab switch failed', err);
          }
          const card = findPackCard(pack);
          if (card?.querySelector('.pack-opener')) return card;
        }
      }
      await sleep(200);
    }
    return null;
  }

  async function openStorePacksFromHub() {
    let hub = null;
    walkViewControllers((controller) => {
      if (hub) return;
      try {
        if (
          win.UTStoreHubViewController &&
          controller instanceof win.UTStoreHubViewController
        ) {
          hub = controller;
        }
      } catch {
        /* not the hub */
      }
    });
    if (hub && typeof win.UTStorePackViewController === 'function') {
      const nav = hub.getNavigationController?.();
      if (nav) {
        await waitNavIdle(nav);
        const next = new win.UTStorePackViewController();
        next.init();
        nav.pushViewController(next);
        return true;
      }
    }
    const tile = win.document.querySelector('.ut-store-hub-view .packs-tile');
    if (!tile) return false;
    clickDomElement(tile);
    return true;
  }

  function setTemplateRunStatus(rowStatus, message) {
    if (rowStatus) rowStatus.textContent = message || '';
    let banner = win.document.getElementById('companion-pack-template-run-status');
    if (!message) {
      banner?.remove();
      return;
    }
    if (!banner) {
      banner = win.document.createElement('div');
      banner.id = 'companion-pack-template-run-status';
      banner.style.cssText = [
        'position:fixed',
        'left:12px',
        'bottom:48px',
        'z-index:100001',
        'max-width:min(420px,90vw)',
        'padding:8px 10px',
        'background:#1b1f24',
        'color:#f5f7fa',
        'border:1px solid rgba(78,230,235,0.45)',
        'border-radius:4px',
        'font:12px/1.35 sans-serif',
        'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
      ].join(';');
      (win.document.body || win.document.documentElement).appendChild(banner);
    }
    banner.textContent = message;
  }

  function clickPackOpenerConfirm(dialog) {
    const popup =
      dialog.closest('.view-modal-container, .ut-dialog, .ea-dialog, .view-modal') ||
      dialog.parentElement;
    if (!popup) return false;
    const ok = [...popup.querySelectorAll('button, .btn-standard')].find((el) => {
      if (el.closest('#companion-pack-rules, #companion-tl-full-sbc')) return false;
      const label = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return label === 'ok';
    });
    if (!ok) return false;
    return clickDomElement(ok);
  }

  async function alignTemplateFreeSpace(dialog, choice) {
    setTlFullSbcChoice(choice || null);
    const wanted = choice?.templateKey ? String(choice.templateKey) : '';
    const start = Date.now();
    while (Date.now() - start < 2500) {
      renderTlFullSbcOptions();
      const select = dialog.querySelector('#companion-tl-full-sbc-select');
      if (!wanted) {
        if (select?.dataset.companionReady === '1') return;
      } else if (select && getRealSelectValue(select) === wanted) {
        return;
      }
      await sleep(150);
    }
    const select = dialog.querySelector('#companion-tl-full-sbc-select');
    if (!select || !wanted) return;
    if (![...select.options].some((opt) => opt.value === wanted)) {
      const opt = win.document.createElement('option');
      opt.value = wanted;
      opt.textContent = wanted;
      select.appendChild(opt);
    }
    setSelectValue(select, wanted);
  }

  function promptPackTemplateName(templates) {
    return new Promise((resolve) => {
      win.document.getElementById('companion-pack-template-name-modal')?.remove();
      const overlay = win.document.createElement('div');
      overlay.id = 'companion-pack-template-name-modal';
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:100002',
        'background:rgba(0,0,0,0.55)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
      ].join(';');
      const card = win.document.createElement('div');
      card.style.cssText = [
        'width:min(420px,92vw)',
        'background:#1b1f24',
        'color:#f5f7fa',
        'padding:16px',
        'border-radius:8px',
        'box-shadow:0 8px 24px rgba(0,0,0,0.45)',
        'font:13px/1.4 sans-serif',
      ].join(';');
      card.innerHTML = `
        <div style="font-weight:700;margin-bottom:8px;color:#4ee6eb;">Save template</div>
        <label for="companion-pack-template-name-input" style="display:block;margin-bottom:6px;">
          Template name
        </label>
        <input id="companion-pack-template-name-input" type="text" maxlength="80"
          style="width:100%;box-sizing:border-box;padding:6px 8px;margin-bottom:8px;" />
        <div id="companion-pack-template-name-status" style="min-height:1.2em;font-size:12px;margin-bottom:8px;"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" id="companion-pack-template-name-cancel" style="padding:6px 10px;cursor:pointer;">Cancel</button>
          <button type="button" id="companion-pack-template-name-save" style="padding:6px 10px;cursor:pointer;">Save</button>
        </div>
      `;
      overlay.appendChild(card);
      (win.document.body || win.document.documentElement).appendChild(overlay);
      const input = card.querySelector('#companion-pack-template-name-input');
      const status = card.querySelector('#companion-pack-template-name-status');
      const save = card.querySelector('#companion-pack-template-name-save');
      const cancel = card.querySelector('#companion-pack-template-name-cancel');
      let overwriteArmed = false;
      const finish = (name) => {
        overlay.remove();
        resolve(name);
      };
      input.addEventListener('input', () => {
        overwriteArmed = false;
        save.textContent = 'Save';
        status.textContent = '';
      });
      save.addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) {
          status.textContent = 'Enter a name.';
          return;
        }
        const duplicate = templates.some((entry) => entry.name === name);
        if (duplicate && !overwriteArmed) {
          overwriteArmed = true;
          save.textContent = 'Overwrite';
          status.textContent = 'A template with this name already exists. Save again to replace it.';
          return;
        }
        finish(name);
      });
      cancel.addEventListener('click', () => finish(null));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) finish(null);
      });
      overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') finish(null);
        if (event.key === 'Enter') save.click();
      });
      input.focus();
    });
  }

  async function savePackOpenerTemplateFromDialog(dialog) {
    const visibleCards = [
      ...win.document.querySelectorAll('.ut-store-pack-details-view'),
    ].filter((card) => card.getClientRects().length > 0);
    const pack =
      state.packOpenerSourcePack ||
      (visibleCards.length === 1 ? readPackFromCard(visibleCards[0]) : null);
    const button = dialog.querySelector('#companion-pack-template-save');
    if (!pack?.id) {
      if (button) button.textContent = 'Open a pack first';
      win.setTimeout(() => {
        if (button) button.textContent = 'Save Template';
      }, 1800);
      return;
    }
    const templates = readPackOpenerTemplates();
    const name = await promptPackTemplateName(templates);
    if (!name) return;
    const current = readPackOpenerTemplates();
    const previous = current.find((entry) => entry.name === name);
    const template = {
      id: previous?.id || newPackTemplateId(),
      name,
      savedAt: Date.now(),
      pack: {
        id: String(pack.id),
        domId: String(pack.domId || pack.id),
        name: pack.name || 'Pack',
        tradeable:
          pack.tradeable === true ? true : pack.tradeable === false ? false : null,
      },
      packCount: readDialogPackCount(dialog),
      nativeFields: snapshotNativePackFields(dialog),
      packRules: cloneJson(getPackRules()),
      minUndercuts: getMinUndercuts(),
      tlFullAction: rememberTransferListFullAction(dialog),
      tlFullSbc: cloneJson(rememberTlFullSbcChoice(dialog)),
    };
    const next = current.filter((entry) => entry.name !== name);
    next.push(template);
    writePackOpenerTemplates(next);
    log('Saved pack opener template', {
      name: template.name,
      pack: template.pack,
      packCount: template.packCount,
      tlFullAction: template.tlFullAction,
    });
    if (button) {
      button.textContent = 'Saved';
      win.setTimeout(() => {
        if (button) button.textContent = 'Save Template';
      }, 1400);
    }
  }

  function ensurePackTemplateSaveButton(dialog) {
    const panel = dialog.querySelector('#companion-pack-rules');
    if (!panel || panel.querySelector('#companion-pack-template-save')) return;
    const row = win.document.createElement('div');
    row.id = 'companion-pack-template-save-row';
    row.style.cssText = 'margin-top:12px;';
    const button = win.document.createElement('button');
    button.id = 'companion-pack-template-save';
    button.type = 'button';
    button.textContent = 'Save Template';
    button.style.cssText = 'padding:6px 10px;cursor:pointer;';
    const note = win.document.createElement('div');
    note.style.cssText = 'opacity:0.75;font-size:11px;margin-top:4px;line-height:1.35;';
    note.textContent =
      'Saves this pack, the Paletools fields, and the companion rules on this screen. Player and manager lists stay shared.';
    button.addEventListener('click', () => {
      savePackOpenerTemplateFromDialog(dialog).catch((err) => {
        warn('Save pack template failed', err);
      });
    });
    row.append(button, note);
    panel.appendChild(row);
  }

  function setHubExtraTilesHidden(grid, hidden) {
    for (const selector of ['.items-tile', '.web-redirect-tile', '.disabled-tile']) {
      const el = grid.querySelector(selector);
      if (!el) continue;
      if (hidden) {
        if (el.dataset.companionTemplateHidden !== '1') {
          el.dataset.companionTemplateDisplay = el.style.display || '';
          el.dataset.companionTemplateHidden = '1';
        }
        el.style.display = 'none';
      } else if (el.dataset.companionTemplateHidden === '1') {
        el.style.display = el.dataset.companionTemplateDisplay || '';
        delete el.dataset.companionTemplateHidden;
        delete el.dataset.companionTemplateDisplay;
      }
    }
  }

  function templateListSignature() {
    return readPackOpenerTemplates()
      .map((entry) => `${entry.id}:${entry.name}:${entry.packCount}:${entry.pack?.name || ''}`)
      .join('|');
  }

  function renderPackTemplateList(panel) {
    panel.textContent = '';
    const templates = readPackOpenerTemplates();
    if (!templates.length) {
      const empty = win.document.createElement('div');
      empty.style.cssText = 'opacity:0.8;font-size:13px;';
      empty.textContent = 'No templates saved yet. Open a pack, set the options, and click Save Template.';
      panel.appendChild(empty);
      return;
    }
    for (const template of templates) {
      const row = win.document.createElement('div');
      row.style.cssText = [
        'display:flex',
        'flex-wrap:wrap',
        'align-items:center',
        'gap:8px',
        'padding:8px 0',
        'border-top:1px solid rgba(255,255,255,0.12)',
      ].join(';');
      const name = win.document.createElement('div');
      name.style.cssText = 'flex:1 1 180px;font-weight:700;';
      const packName = template.pack?.name ? ` — ${template.pack.name}` : '';
      name.textContent = `${template.name}${packName}`;
      const count = win.document.createElement('input');
      count.type = 'number';
      count.min = '1';
      count.step = '1';
      count.value = String(template.packCount > 0 ? template.packCount : 1);
      count.title = 'Packs to open';
      count.style.cssText = 'width:72px;padding:4px 6px;';
      const start = win.document.createElement('button');
      start.type = 'button';
      start.textContent = 'Start';
      start.style.cssText = 'padding:6px 10px;cursor:pointer;';
      const remove = win.document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Delete';
      remove.style.cssText = 'padding:6px 10px;cursor:pointer;';
      const status = win.document.createElement('div');
      status.style.cssText = 'flex:1 0 100%;font-size:12px;min-height:1em;opacity:0.85;';
      start.addEventListener('click', () => {
        const n = parseTemplateRunCount(count.value);
        if (!n) {
          status.textContent = 'Enter how many packs to open.';
          return;
        }
        startPackOpenerTemplate(template, n, status).catch((err) => {
          warn('Start pack template failed', err);
          setTemplateRunStatus(status, 'Could not start that template.');
          state.packTemplateStarting = false;
        });
      });
      remove.addEventListener('click', () => {
        writePackOpenerTemplates(
          readPackOpenerTemplates().filter((entry) => entry.id !== template.id)
        );
        log('Deleted pack opener template', template.name);
        const grid = panel.closest('.grid');
        if (grid) syncPackTemplateList(grid, true);
      });
      row.append(name, count, start, remove, status);
      panel.appendChild(row);
    }
  }

  function syncPackTemplateList(grid, force) {
    const button = grid.querySelector('#companion-pack-templates-tile');
    let panel = grid.querySelector('#companion-pack-templates-panel');
    if (!state.packTemplatesListOpen) {
      if (panel || grid.querySelector('[data-companion-template-hidden]')) {
        withCompanionDomWrite(() => {
          panel?.remove();
          setHubExtraTilesHidden(grid, false);
        });
      }
      if (button) button.setAttribute('aria-expanded', 'false');
      return;
    }
    if (button) button.setAttribute('aria-expanded', 'true');
    const signature = templateListSignature();
    if (!force && panel?.dataset.signature === signature && panel.childElementCount) {
      setHubExtraTilesHidden(grid, true);
      return;
    }
    withCompanionDomWrite(() => {
      setHubExtraTilesHidden(grid, true);
      if (!panel) {
        panel = win.document.createElement('div');
        panel.id = 'companion-pack-templates-panel';
        panel.style.cssText = [
          'grid-column:1 / -1',
          'width:100%',
          'box-sizing:border-box',
          'margin:4px 0 12px',
          'padding:12px',
          'background:rgba(0,0,0,0.35)',
          'border:1px solid rgba(78,230,235,0.45)',
          'border-radius:4px',
          'color:#f5f7fa',
          'font:13px/1.4 sans-serif',
        ].join(';');
        button?.insertAdjacentElement('afterend', panel);
      }
      panel.dataset.signature = signature;
      renderPackTemplateList(panel);
    });
  }

  function ensureStorePackTemplates() {
    const grid = win.document.querySelector('.ut-store-hub-view .grid.layout-hub');
    if (!grid) return;
    if (!state.packTemplateDismissInstalled) {
      state.packTemplateDismissInstalled = true;
      win.document.addEventListener(
        'click',
        (event) => {
          const target = event.target;
          if (!(target instanceof win.Element)) return;
          const tile = target.closest('.packs-tile, .points-tile');
          if (!tile || !tile.closest('.ut-store-hub-view')) return;
          if (!state.packTemplatesListOpen) return;
          state.packTemplatesListOpen = false;
          const host = tile.closest('.grid');
          if (host) syncPackTemplateList(host);
        },
        true
      );
    }
    let button = grid.querySelector('#companion-pack-templates-tile');
    if (!button) {
      const anchor = grid.querySelector('.points-tile') || grid.querySelector('.packs-tile');
      if (!anchor) return;
      button = win.document.createElement('button');
      button.id = 'companion-pack-templates-tile';
      button.type = 'button';
      button.textContent = 'Pack Opener Templates';
      button.setAttribute('aria-expanded', 'false');
      button.style.cssText = [
        'grid-column:1 / -1',
        'width:100%',
        'box-sizing:border-box',
        'margin:8px 0',
        'padding:14px 16px',
        'cursor:pointer',
        'background:#1b2433',
        'color:#4ee6eb',
        'border:1px solid rgba(78,230,235,0.45)',
        'border-radius:4px',
        'font:700 14px/1.2 sans-serif',
        'text-align:left',
      ].join(';');
      button.addEventListener('click', () => {
        state.packTemplatesListOpen = !state.packTemplatesListOpen;
        syncPackTemplateList(grid, true);
      });
      withCompanionDomWrite(() => anchor.insertAdjacentElement('afterend', button));
    }
    syncPackTemplateList(grid);
  }

  async function prepareTemplateDialog(dialog, template, count) {
    await waitForValue(
      () => dialog.querySelector('#pack-opener-purchase-count .ut-number-input-control'),
      2000
    );
    enhancePackOpenerDialog();
    applyNativePackFields(dialog, template.nativeFields);
    ensureTransferListFullFreeSpaceOption(dialog);
    const tlFull = dialog.querySelector(SELECTORS.transferListFull);
    if (tlFull && template.tlFullAction) {
      setSelectValue(tlFull, template.tlFullAction);
      tlFull.dispatchEvent(new win.Event('change', { bubbles: true }));
    }
    setDialogPackCount(dialog, count);
    await alignTemplateFreeSpace(dialog, template.tlFullSbc);
    forceNativePackCategorySelectsToFacade(dialog);
  }

  async function startPackOpenerTemplate(template, count, rowStatus) {
    if (state.packTemplateStarting || state.packOpenerRunning) {
      setTemplateRunStatus(
        rowStatus,
        state.packOpenerRunning
          ? 'Pack Opener is already running.'
          : 'A template is already starting.'
      );
      return;
    }
    if (!template?.pack?.id) {
      setTemplateRunStatus(rowStatus, 'This template has no pack. Open that pack and save again.');
      return;
    }
    if (win.document.querySelector(SELECTORS.dialog)) {
      setTemplateRunStatus(rowStatus, 'Close the Pack Opener dialog, then start the template.');
      return;
    }
    state.packTemplateStarting = true;
    try {
      let card = findPackCard(template.pack);
      if (!card?.querySelector('.pack-opener')) {
        setTemplateRunStatus(rowStatus, `Opening store packs for ${template.pack.name || template.name}…`);
        if (!findStorePackController()) {
          const opened = await openStorePacksFromHub();
          if (!opened) {
            setTemplateRunStatus(rowStatus, 'That pack is not in the current store.');
            return;
          }
        }
        card = await waitForSavedPackCard(template.pack);
      }
      if (!card) {
        setTemplateRunStatus(rowStatus, 'That pack is not in the current store.');
        return;
      }
      const opener = card.querySelector('.pack-opener');
      if (!opener) {
        setTemplateRunStatus(rowStatus, 'Could not open Pack Opener for this pack.');
        return;
      }
      state.packOpenerSourcePack = readPackFromCard(card) || template.pack;
      setPackRules(template.packRules || {});
      setMinUndercuts(template.minUndercuts);
      setTlFullSbcChoice(template.tlFullSbc || null);
      state.tlFullAction = template.tlFullAction || 'stopProcess';
      setTemplateRunStatus(rowStatus, `Starting ${template.name}…`);
      clickDomElement(opener);
      const dialog = await waitForValue(
        () => win.document.querySelector(SELECTORS.dialog),
        6000
      );
      if (!dialog) {
        setTemplateRunStatus(rowStatus, 'Could not open Pack Opener for this pack.');
        return;
      }
      await prepareTemplateDialog(dialog, template, count);
      if (!clickPackOpenerConfirm(dialog)) {
        setTemplateRunStatus(rowStatus, 'Could not confirm Pack Opener.');
        return;
      }
      setTemplateRunStatus(null, '');
      log('Started pack opener template', {
        name: template.name,
        count,
        pack: template.pack,
      });
    } finally {
      state.packTemplateStarting = false;
    }
  }

  function ensureCompanionPanels(dialog) {
    if (!dialog) return;

    withCompanionDomWrite(() => {
      // Remove legacy split panels if present from older companion builds
      dialog
        .querySelector('#companion-important-manager-nations')
        ?.remove();
      dialog
        .querySelector('#companion-important-duplicate-leagues')
        ?.remove();

      if (!dialog.querySelector('#companion-pack-rules')) {
        const panel = buildPackRulesPanel({
          id: 'companion-pack-rules',
          undercutInputId: 'companion-undercuts-dialog',
          showImportantListsHint: true,
        });

        const insertBefore =
          dialog.querySelector(
            'label[for="pack-opener-players-purchase-action"]'
          ) ||
          dialog.querySelector(
            'label[for="pack-opener-managers-purchase-action"]'
          ) ||
          dialog.querySelector(SELECTORS.players) ||
          dialog.querySelector(SELECTORS.managers);
        if (insertBefore) dialog.insertBefore(panel, insertBefore);
        else dialog.appendChild(panel);
      }

      hideNativePackCategoryPrompts(dialog);
      forceNativePackCategorySelectsToFacade(dialog);
      ensurePackTemplateSaveButton(dialog);
    });
  }

  function enhancePackOpenerDialog() {
    if (state.enhancingDialog || state.companionDomWrite) return;

    const dialog = win.document.querySelector(SELECTORS.dialog);
    if (!dialog) return;
    ensureTransferListFullFreeSpaceOption(dialog);

    const players = dialog.querySelector(SELECTORS.players);
    const managers = dialog.querySelector(SELECTORS.managers);
    const dupManagers = dialog.querySelector(SELECTORS.duplicatedManagers);
    const dupPlayers = dialog.querySelector(SELECTORS.duplicatedPlayers);
    const items = dialog.querySelector(SELECTORS.items);
    const dupItems = dialog.querySelector(SELECTORS.duplicatedItems);
    if (
      !players &&
      !managers &&
      !dupManagers &&
      !dupPlayers &&
      !items &&
      !dupItems
    ) {
      return;
    }

    const panelsReady = !!dialog.querySelector('#companion-pack-rules');
    const facadeReady = NATIVE_PACK_CATEGORY_SELECTORS.every((selector) => {
      const select = dialog.querySelector(selector);
      return !select || select.dataset.companionFacade === '1';
    });
    if (dialog.dataset.companionEnhanced === '1' && panelsReady && facadeReady) {
      hideNativePackCategoryPrompts(dialog);
      forceNativePackCategorySelectsToFacade(dialog);
      return;
    }

    state.enhancingDialog = true;
    try {
      // Opening the dialog means a new run may start — clear any sticky early-stop arm
      if (dialog.dataset.companionEarlyStopReset !== '1') {
        dialog.dataset.companionEarlyStopReset = '1';
        resetEarlyStopState();
      }

      // Ensure pack rules exist (migrates legacy custom actions once)
      getPackRules();

      if (players) wireSelect(players, 'players');
      if (managers) wireSelect(managers, 'managers');
      if (dupManagers) wireSelect(dupManagers, 'duplicatedManagers');
      if (dupPlayers) wireSelect(dupPlayers, 'duplicatedPlayers');
      if (items) wireSelect(items, 'items');
      if (dupItems) wireSelect(dupItems, 'duplicatedItems');
      ensureCompanionPanels(dialog);
      ensureTransferListFullFreeSpaceOption(dialog);
      installServiceHooks();
      dialog.dataset.companionEnhanced = '1';

      if (dialog.dataset.companionResync !== '1') {
        dialog.dataset.companionResync = '1';
        win.setTimeout(() => {
          withCompanionDomWrite(() => {
            forceNativePackCategorySelectsToFacade(dialog);
            hideNativePackCategoryPrompts(dialog);
            ensureTransferListFullFreeSpaceOption(dialog);
          });
          installServiceHooks();
          log('Pack Opener companion rules ready', {
            packRules: getPackRules(),
            importantNations: [...getImportantNationIds()],
            importantLeagues: [...getImportantLeagueIds()],
            minUndercuts: getMinUndercuts(),
          });
        }, 100);
      }
    } finally {
      state.enhancingDialog = false;
    }
  }

  function ensureFloatingEntry() {
    if (win.document.getElementById('companion-settings-fab')) return;
    if (!win.document.body && !win.document.documentElement) return;

    const btn = win.document.createElement('button');
    btn.id = 'companion-settings-fab';
    btn.type = 'button';
    btn.textContent = 'Companion';
    btn.title = 'Paletools Companion settings';
    btn.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:99999',
      'padding:8px 10px',
      'border:none',
      'border-radius:4px',
      'background:#1f6feb',
      'color:#fff',
      'font:12px/1.2 sans-serif',
      'cursor:pointer',
      'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
    ].join(';');
    btn.addEventListener('click', openStandaloneCompanionEditor);
    (win.document.body || win.document.documentElement).appendChild(btn);
  }

  // ---------------------------------------------------------------------------
  // One-click SBC templates. Selection only: the open work area is filled
  // and the normal confirm screen stays the user's submit.
  // ---------------------------------------------------------------------------

  function readOneClickTemplates() {
    const saved = readJson(STORAGE_ONE_CLICK_TEMPLATES, {});
    return saved && typeof saved === 'object' ? saved : {};
  }

  function writeOneClickTemplates(templates) {
    writeJson(STORAGE_ONE_CLICK_TEMPLATES, templates);
  }

  function blankRating(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : '';
  }

  function blankId(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : '';
  }

  function defaultOneClickStep() {
    return {
      count: 1,
      minRating: '',
      maxRating: '',
      leagueId: '',
      nationId: '',
      importantLeaguesOnly: false,
      unimportantLeaguesOnly: false,
      importantNationsOnly: false,
      unimportantNationsOnly: false,
      ignoreImportanceTransfer: false,
      ignoreImportanceStorage: false,
      searchSource: SBC_SEARCH_SOURCE.CLUB,
    };
  }

  function normalizeOneClickStep(raw) {
    const known = new Set(Object.values(SBC_SEARCH_SOURCE));
    const source = Number(raw?.searchSource);
    let minRating = blankRating(raw?.minRating);
    let maxRating = blankRating(raw?.maxRating);
    if (minRating !== '' && maxRating !== '' && minRating > maxRating) {
      const swap = minRating;
      minRating = maxRating;
      maxRating = swap;
    }
    const countNumber = Math.floor(Number(raw?.count));
    const count =
      raw?.count === '' || raw?.count == null || !Number.isFinite(countNumber) || countNumber < 1
        ? ''
        : Math.min(30, countNumber);
    return {
      count,
      minRating,
      maxRating,
      leagueId: blankId(raw?.leagueId),
      nationId: blankId(raw?.nationId),
      importantLeaguesOnly: !!raw?.importantLeaguesOnly,
      unimportantLeaguesOnly: !!raw?.unimportantLeaguesOnly,
      importantNationsOnly: !!raw?.importantNationsOnly,
      unimportantNationsOnly: !!raw?.unimportantNationsOnly,
      ignoreImportanceTransfer: !!raw?.ignoreImportanceTransfer,
      ignoreImportanceStorage: !!raw?.ignoreImportanceStorage,
      searchSource: known.has(source) ? source : SBC_SEARCH_SOURCE.CLUB,
    };
  }

  function oneClickTemplateFor(challengeId) {
    const saved = readOneClickTemplates()[String(challengeId)];
    const steps = Array.isArray(saved?.steps) ? saved.steps.map(normalizeOneClickStep) : [];
    return { steps };
  }

  function saveOneClickTemplate(challengeId, steps, meta) {
    const templates = readOneClickTemplates();
    const previous = templates[String(challengeId)] || {};
    const name = meta?.name || previous.name || '';
    const setId =
      Number(meta?.setId) > 0
        ? Number(meta.setId)
        : Number(previous.setId) > 0
          ? Number(previous.setId)
          : null;
    const next = {
      steps: (steps || []).map(normalizeOneClickStep),
    };
    if (name && !isGenericSbcLabel(name)) next.name = name;
    if (setId) next.setId = setId;
    templates[String(challengeId)] = next;
    writeOneClickTemplates(templates);
  }

  function rememberOneClickTemplateName(challengeId, name, setId) {
    const templates = readOneClickTemplates();
    const key = String(challengeId);
    const saved = templates[key];
    if (!saved || !Array.isArray(saved.steps) || !saved.steps.length) return;
    const title = String(name || '').trim();
    const named = title && !isGenericSbcLabel(title);
    const nextSetId = Number(setId) > 0 ? Number(setId) : null;
    if (!named && !nextSetId) return;
    if (named && saved.name === title && (!nextSetId || saved.setId === nextSetId)) return;
    if (named) saved.name = title;
    if (nextSetId) saved.setId = nextSetId;
    templates[key] = saved;
    writeOneClickTemplates(templates);
  }

  function oneClickChallengeTitle(challengeId) {
    const wanted = Number(challengeId);
    for (const set of collectSbcSets()) {
      let challenge = challengeFromSet(set, wanted);
      if (!challenge) {
        challenge =
          challengesOnSet(set).find((entry) => Number(entry?.id) === wanted) || null;
      }
      if (!challenge) continue;
      return {
        name: sbcOptionTitle(set, challenge),
        setId: Number(set.id) || null,
      };
    }
    return null;
  }

  async function resolveOneClickTemplateNames() {
    const templates = readOneClickTemplates();
    let missing = [];
    let changed = false;
    for (const [id, saved] of Object.entries(templates)) {
      if (!Array.isArray(saved?.steps) || !saved.steps.length) continue;
      if (saved.name && !isGenericSbcLabel(saved.name)) continue;
      const challengeId = Number(id);
      if (!(challengeId > 0)) continue;
      const known = oneClickChallengeTitle(challengeId);
      if (known?.name && !isGenericSbcLabel(known.name)) {
        saved.name = known.name;
        if (known.setId) saved.setId = known.setId;
        templates[id] = saved;
        changed = true;
        continue;
      }
      missing.push(challengeId);
    }
    if (changed) writeOneClickTemplates(templates);
    if (!missing.length) return;
    const loaded = await loadSbcSets();
    if (loaded?.softban) return;
    if (typeof win.services?.SBC?.requestChallengesForSet !== 'function') return;
    for (const set of collectSbcSets()) {
      if (!missing.length) break;
      if (challengesOnSet(set).length) {
        missing = missing.filter((id) => !oneClickChallengeTitle(id));
        continue;
      }
      await pace('move');
      const response = await awaitObservable(() => win.services.SBC.requestChallengesForSet(set));
      if (isSoftBanPayload(response)) {
        log('Stopped loading one-click challenge names', { softban: true });
        break;
      }
      missing = missing.filter((id) => !oneClickChallengeTitle(id));
    }
    const latest = readOneClickTemplates();
    let named = 0;
    for (const id of Object.keys(latest)) {
      const saved = latest[id];
      if (!saved?.steps?.length || (saved.name && !isGenericSbcLabel(saved.name))) continue;
      const known = oneClickChallengeTitle(id);
      if (!known?.name || isGenericSbcLabel(known.name)) continue;
      saved.name = known.name;
      if (known.setId) saved.setId = known.setId;
      latest[id] = saved;
      named += 1;
    }
    if (named) {
      writeOneClickTemplates(latest);
      log('One-click challenge names loaded', { count: named });
    }
  }

  function oneClickStepCriteria(step) {
    return {
      ovrMin: step.minRating,
      ovrMax: step.maxRating,
      league: step.leagueId,
      nation: step.nationId,
    };
  }

  function oneClickSourceParts(source) {
    const S = SBC_SEARCH_SOURCE;
    switch (Number(source)) {
      case S.STORAGE:
        return ['storage'];
      case S.CLUB:
        return ['club'];
      case S.STORAGE_CLUB:
        return ['storage', 'club'];
      case S.CLUB_STORAGE:
        return ['club', 'storage'];
      case S.TRANSFER_STORAGE_CLUB:
        return ['transfer', 'storage', 'club'];
      case S.TRANSFER_STORAGE:
        return ['transfer', 'storage'];
      case S.TRANSFER_CLUB:
        return ['transfer', 'club'];
      case S.TRANSFER_CLUB_STORAGE:
        return ['transfer', 'club', 'storage'];
      case S.TRANSFER:
        return ['transfer'];
      default:
        return ['club'];
    }
  }

  function oneClickSourceOptions() {
    const labels = getSbcSearchModeLabels();
    return [
      [SBC_SEARCH_SOURCE.STORAGE, labels.storage],
      [SBC_SEARCH_SOURCE.CLUB, labels.club],
      [SBC_SEARCH_SOURCE.STORAGE_CLUB, `${labels.storage} / ${labels.club}`],
      [SBC_SEARCH_SOURCE.CLUB_STORAGE, `${labels.club} / ${labels.storage}`],
      [SBC_SEARCH_SOURCE.TRANSFER_STORAGE_CLUB, labels.transferStorageClub],
      [SBC_SEARCH_SOURCE.TRANSFER_STORAGE, labels.transferStorage],
      [SBC_SEARCH_SOURCE.TRANSFER_CLUB, labels.transferClub],
      [SBC_SEARCH_SOURCE.TRANSFER_CLUB_STORAGE, labels.transferClubStorage],
      [SBC_SEARCH_SOURCE.TRANSFER, labels.transfer],
    ];
  }

  function isOneClickChallenge(challenge) {
    try {
      if (typeof challenge?.isOneClickChallenge === 'function' && challenge.isOneClickChallenge()) {
        return true;
      }
    } catch {
      /* ignore */
    }
    const oneClick = win.SBCChallengeType?.ONE_CLICK;
    return oneClick != null && challenge?.type === oneClick;
  }

  function listLoadedOneClickChallenges() {
    const rows = [];
    for (const set of collectSbcSets()) {
      for (const challenge of challengesOnSet(set)) {
        if (!isOneClickChallenge(challenge)) continue;
        const challengeId = Number(challenge.id);
        if (!(challengeId > 0)) continue;
        rows.push({
          challengeId,
          setId: Number(set.id) || null,
          label: sbcOptionTitle(set, challenge),
          scoreRequirement: Number(challenge.scoreRequirement) || 0,
          submittedScore: Number(challenge.submittedScore) || 0,
        });
      }
    }
    rows.sort((a, b) => a.label.localeCompare(b.label));
    return rows;
  }

  async function refreshOneClickChallengeCatalog() {
    const loaded = await loadSbcSets();
    if (loaded?.softban) return { softban: true, challenges: [] };
    if (typeof win.services?.SBC?.requestChallengesForSet === 'function') {
      for (const set of collectSbcSets()) {
        if (challengesOnSet(set).some(isOneClickChallenge)) continue;
        if (challengesOnSet(set).length) continue;
        await pace('move');
        const response = await awaitObservable(() => win.services.SBC.requestChallengesForSet(set));
        if (isSoftBanPayload(response)) {
          return { softban: true, challenges: listLoadedOneClickChallenges() };
        }
      }
    }
    return { softban: false, challenges: listLoadedOneClickChallenges() };
  }

  function findPaletoolsPlugins() {
    const looksLike = (value) =>
      !!value &&
      (Array.isArray(value.importantLeagues?.leagueIds) ||
        Array.isArray(value.plugins?.importantLeagues?.leagueIds) ||
        Array.isArray(value.importantNations?.nationIds) ||
        Array.isArray(value.plugins?.importantNations?.nationIds));
    const pluginsOf = (value) => (value?.plugins?.importantLeagues ? value.plugins : value);
    try {
      for (const key of Object.getOwnPropertyNames(win)) {
        if (!/paletool|setting|plugin/i.test(key)) continue;
        let value = null;
        try {
          value = win[key];
        } catch {
          value = null;
        }
        if (looksLike(value)) return pluginsOf(value);
      }
    } catch {
      /* ignore */
    }
    try {
      for (let i = 0; i < win.localStorage.length; i++) {
        const key = win.localStorage.key(i);
        if (!key || !/paletool/i.test(key)) continue;
        const parsed = readJson(key, null);
        if (looksLike(parsed)) return pluginsOf(parsed);
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  let loggedMissingPaletoolsImportance = false;

  function readPaletoolsImportanceLists() {
    const plugins = findPaletoolsPlugins();
    const leagues = new Set();
    const nations = new Set();
    const leagueIds = plugins?.importantLeagues?.leagueIds;
    const nationIds = plugins?.importantNations?.nationIds;
    if (Array.isArray(leagueIds)) {
      for (const id of leagueIds) {
        const n = Number(id);
        if (Number.isFinite(n)) leagues.add(n);
      }
    }
    if (Array.isArray(nationIds)) {
      for (const id of nationIds) {
        const n = Number(id);
        if (Number.isFinite(n)) nations.add(n);
      }
    }
    if (!plugins && !loggedMissingPaletoolsImportance) {
      loggedMissingPaletoolsImportance = true;
      log('Paletools important league and nation lists were not found');
    }
    return { found: !!plugins, leagues, nations };
  }

  function passesPaletoolsImportance(item, step, lists) {
    const leagueId = getLeagueId(item);
    const nationId = getNationId(item);
    if (step.importantLeaguesOnly && lists.leagues.size) {
      if (leagueId == null || !lists.leagues.has(leagueId)) return false;
    }
    if (step.unimportantLeaguesOnly && lists.leagues.size) {
      if (leagueId != null && lists.leagues.has(leagueId)) return false;
    }
    if (step.importantNationsOnly && lists.nations.size) {
      if (nationId == null || !lists.nations.has(nationId)) return false;
    }
    if (step.unimportantNationsOnly && lists.nations.size) {
      if (nationId != null && lists.nations.has(nationId)) return false;
    }
    return true;
  }

  function oneClickItemLocked(item) {
    const id = itemResourceId(item);
    if (id == null) return false;
    try {
      return !!win.services?.SBC?.isItemInSquad?.(id);
    } catch {
      return false;
    }
  }

  function isStandardOneClickItem(item) {
    if (!item) return false;
    try {
      if (typeof item.isSpecial === 'function') return !item.isSpecial();
      if (typeof item.isCommon === 'function' && item.isCommon()) return true;
      if (typeof item.isRare === 'function' && item.isRare()) return true;
    } catch {
      /* ignore */
    }
    const rare = rareflagOf(item);
    const Rarity = win.ItemRarity;
    if (Rarity && rare != null) return rare === Rarity.NONE || rare === Rarity.RARE;
    return rare === 0 || rare === 1;
  }

  function oneClickSearchCriteria(challengeId, step, pile, offset, count) {
    let criteria = null;
    try {
      if (typeof win.UTSearchCriteriaDTO === 'function') criteria = new win.UTSearchCriteriaDTO();
    } catch {
      criteria = null;
    }
    if (!criteria) criteria = {};
    try {
      if (win.SearchType?.PLAYER != null) criteria.type = win.SearchType.PLAYER;
    } catch {
      /* ignore */
    }
    criteria.sbcChallengeId = Number(challengeId);
    criteria.count = count;
    criteria.offset = offset;
    try {
      if (win.SearchLevel?.ANY != null) criteria.level = win.SearchLevel.ANY;
      if (win.SearchSortType?.OVERALL != null) criteria.sortBy = win.SearchSortType.OVERALL;
      const orders = win.SearchSortOrder;
      if (orders) {
        criteria.sort = criteriaHasBound(step.minRating) ? orders.DESCENDING : orders.ASCENDING;
      }
      const piles = win.PileSearchType;
      if (piles) criteria.pileSearchType = pile === 'storage' ? piles.STORAGE : piles.CLUB;
    } catch {
      /* ignore */
    }
    if (criteriaHasBound(step.minRating)) criteria.ovrMin = Number(step.minRating);
    if (criteriaHasBound(step.maxRating)) criteria.ovrMax = Number(step.maxRating);
    if (criteriaHasBound(step.leagueId)) criteria.league = Number(step.leagueId);
    if (criteriaHasBound(step.nationId)) criteria.nation = Number(step.nationId);
    return criteria;
  }

  async function searchOneClickPile(challengeId, step, pile, shouldStop) {
    const Club = win.services?.Club;
    if (typeof Club?.search !== 'function') {
      return { softban: false, items: [], missing: true };
    }
    const items = [];
    const seen = new Set();
    let offset = 0;
    const pageSize = 50;
    for (let page = 0; page < 8; page++) {
      await pace('move');
      const criteria = oneClickSearchCriteria(challengeId, step, pile, offset, pageSize);
      let response = null;
      try {
        response = await awaitObservable(() => Club.search(criteria));
      } catch (err) {
        if (isSoftBanPayload(err)) return { softban: true, items };
        log('One-click club search failed', err);
        break;
      }
      if (isSoftBanPayload(response)) return { softban: true, items };
      const batch = extractItemsFromObserveResponse(response);
      for (const item of batch) {
        const id = itemResourceId(item);
        if (id == null || seen.has(id)) continue;
        seen.add(id);
        items.push(item);
      }
      const retrievedAll = !!(response?.response?.retrievedAll || response?.retrievedAll);
      offset += batch.length;
      if (retrievedAll || !batch.length) break;
      if (typeof shouldStop === 'function' && shouldStop(items)) break;
    }
    return { softban: false, items };
  }

  async function attachOneClickScores(challengeId, items) {
    const Club = win.services?.Club;
    const players = items || [];
    if (!players.length || typeof Club?.search !== 'function') {
      return { softban: false, items: players };
    }
    const ids = definitionIdsFromPlayers(
      players.filter((item) => !(Number(item.sbsScore) > 0))
    );
    const scored = [];
    for (let i = 0; i < ids.length; i += 10) {
      await pace('move');
      const criteria = newDefIdClubSearchCriteria(ids.slice(i, i + 10));
      criteria.sbcChallengeId = Number(challengeId);
      criteria.isExactSearch = true;
      let response = null;
      try {
        response = await awaitObservable(() => Club.search(criteria));
      } catch (err) {
        if (isSoftBanPayload(err)) return { softban: true, items: players };
        log('One-click score search failed', err);
        continue;
      }
      if (isSoftBanPayload(response)) return { softban: true, items: players };
      scored.push(...extractItemsFromObserveResponse(response));
    }
    const byId = new Map();
    const scoreByDef = new Map();
    for (const item of scored) {
      const id = Number(item?.id);
      if (Number.isFinite(id) && id > 0) byId.set(id, item);
      const def = Number(definitionIdOf(item));
      const score = Number(item?.sbsScore ?? item?.gradingScore);
      if (Number.isFinite(def) && score > 0 && !scoreByDef.has(def)) scoreByDef.set(def, score);
    }
    let attached = 0;
    const scoredItems = players.map((item) => {
      const ownId = Number(item?.id);
      const replaced = Number.isFinite(ownId) ? byId.get(ownId) : null;
      if (replaced && Number(replaced.sbsScore ?? replaced.gradingScore) > 0) {
        attached += 1;
        return replaced;
      }
      if (Number(item.sbsScore) > 0) {
        attached += 1;
        return item;
      }
      const score = scoreByDef.get(Number(definitionIdOf(item)));
      if (!(score > 0)) return item;
      item.sbsScore = score;
      attached += 1;
      return item;
    });
    log('One-click duplicate scores', { requested: ids.length, scored: attached });
    return { softban: false, items: scoredItems };
  }

  function compareOneClickScore(a, b) {
    return (Number(a?.sbsScore) || 0) - (Number(b?.sbsScore) || 0);
  }

  function orderOneClickCandidates(preferred, rest) {
    const preferredIds = new Set(
      (preferred || []).map((item) => itemResourceId(item)).filter((id) => id != null)
    );
    const first = (preferred || [])
      .filter((item) => preferredIds.has(itemResourceId(item)))
      .slice()
      .sort(compareOneClickScore);
    const seen = new Set(first.map((item) => itemResourceId(item)));
    const second = (rest || [])
      .filter((item) => {
        const id = itemResourceId(item);
        return id != null && !seen.has(id) && !preferredIds.has(id);
      })
      .slice()
      .sort(compareOneClickScore);
    return first.concat(second);
  }

  function oneClickPoolMeetsTarget(items, room, neededScore) {
    if (!(room > 0)) return true;
    if (neededScore > 0) {
      const take = takeOneClickUntilRequirement(items, room, neededScore);
      const score = take.reduce((sum, item) => sum + (Number(item.sbsScore) || 0), 0);
      if (score >= neededScore) return true;
    }
    return (items || []).length >= room;
  }

  function prepareOneClickEligible(preferred, pileItems, step, usedIds, importance) {
    const criteria = oneClickStepCriteria(step);
    const preferredIds = new Set(
      (preferred || []).map((item) => itemResourceId(item)).filter((id) => id != null)
    );
    const merged = [];
    const seen = new Set();
    for (const item of (preferred || []).concat(pileItems || [])) {
      const id = itemResourceId(item);
      if (id == null || seen.has(id) || usedIds.has(id)) continue;
      if (!(Number(item.sbsScore) > 0)) continue;
      if (!isStandardOneClickItem(item)) continue;
      if (oneClickItemLocked(item)) continue;
      if (!itemMatchesSearchCriteria(item, criteria)) continue;
      seen.add(id);
      merged.push(item);
    }
    const spareIds = new Set();
    if (step.ignoreImportanceTransfer) {
      for (const item of preferred || []) {
        const defId = definitionIdOf(item);
        if (defId != null) spareIds.add(defId);
      }
    }
    let eligible = merged.filter((item) => passesPaletoolsImportance(item, step, importance));
    const lists = sbcListsForTemplateSettings(step);
    if (sbcListsActive(lists)) {
      const held = holdUniqueSbcPlayers(eligible, spareIds, lists, {
        skipStorage: !!step.ignoreImportanceStorage,
      });
      eligible = held.items;
    }
    return orderOneClickCandidates(
      eligible.filter((item) => preferredIds.has(itemResourceId(item))),
      eligible
    );
  }

  async function collectOneClickStepItems(challengeId, step, usedIds, importance, target) {
    const room = target?.room > 0 ? target.room : 30;
    const neededScore = target?.neededScore > 0 ? target.neededScore : null;
    const parts = oneClickSourceParts(step.searchSource);
    let preferred = [];
    if (parts.includes('transfer')) {
      const transfers = await fetchUnlistedTransferPlayers();
      preferred = await resolveClubCopiesForTransferPlayers(
        transfers,
        oneClickStepCriteria(step)
      );
      const scored = await attachOneClickScores(challengeId, preferred);
      if (scored.softban) return { softban: true, items: [] };
      preferred = scored.items || [];
    }
    let pileItems = [];
    const meets = () => oneClickPoolMeetsTarget(prepareOneClickEligible(preferred, pileItems, step, usedIds, importance), room, neededScore);
    for (const pile of parts) {
      if (pile === 'transfer') continue;
      if (meets()) break;
      const searched = await searchOneClickPile(challengeId, step, pile, (soFar) =>
        oneClickPoolMeetsTarget(
          prepareOneClickEligible(preferred, pileItems.concat(soFar), step, usedIds, importance),
          room,
          neededScore
        )
      );
      if (searched.softban) return { softban: true, items: [] };
      if (searched.missing) return { missing: true, items: [] };
      pileItems = pileItems.concat(searched.items || []);
    }
    const ordered = prepareOneClickEligible(preferred, pileItems, step, usedIds, importance);
    log('One-click step candidates', {
      raw: (preferred?.length || 0) + pileItems.length,
      eligible: ordered.length,
      minRating: step.minRating === '' ? null : step.minRating,
      maxRating: step.maxRating === '' ? null : step.maxRating,
    });
    return { softban: false, items: ordered };
  }

  function walkViewControllers(visit) {
    const seen = new Set();
    const queue = [];
    const push = (value) => {
      if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
      if (seen.has(value)) return;
      seen.add(value);
      queue.push(value);
    };
    try {
      push(win.getAppMain?.().getRootViewController?.());
    } catch {
      /* ignore */
    }
    try {
      push(getGameNavigationController());
    } catch {
      /* ignore */
    }
    let scanned = 0;
    while (queue.length && scanned < 250) {
      const current = queue.shift();
      scanned += 1;
      visit(current);
      const next = [];
      try {
        if (typeof current.getCurrentViewController === 'function') {
          next.push(current.getCurrentViewController());
        }
      } catch {
        /* ignore */
      }
      try {
        if (typeof current.getPresentedViewController === 'function') {
          next.push(current.getPresentedViewController());
        }
      } catch {
        /* ignore */
      }
      try {
        if (typeof current.getRootController === 'function') next.push(current.getRootController());
      } catch {
        /* ignore */
      }
      try {
        const list =
          typeof current.getViewControllers === 'function'
            ? current.getViewControllers()
            : null;
        if (Array.isArray(list)) next.push(...list);
      } catch {
        /* ignore */
      }
      try {
        const keys = Object.keys(current);
        for (const key of keys) {
          if (!/controller|stack/i.test(key)) continue;
          const value = current[key];
          if (Array.isArray(value)) {
            for (const entry of value) {
              if (
                entry &&
                (typeof entry.getView === 'function' ||
                  typeof entry.getCurrentViewController === 'function')
              ) {
                next.push(entry);
              }
            }
          } else if (
            value &&
            (typeof value.getView === 'function' ||
              typeof value.getCurrentViewController === 'function')
          ) {
            next.push(value);
          }
        }
      } catch {
        /* ignore */
      }
      for (const child of next) push(child);
    }
  }

  function findOpenOneClickWorkArea(challengeId) {
    const Controller = win.UTOneClickSBCWorkAreaViewController;
    if (typeof Controller !== 'function') return null;
    const wanted = Number(challengeId);
    let match = null;
    walkViewControllers((controller) => {
      if (match) return;
      let isWorkArea = false;
      try {
        isWorkArea = controller instanceof Controller;
      } catch {
        isWorkArea = false;
      }
      if (!isWorkArea) return;
      const vm = controller.viewModel || controller.getViewModel?.();
      const id = Number(vm?.getChallenge?.()?.id ?? vm?._challenge?.id);
      if (id === wanted) match = controller;
    });
    return match;
  }

  function clearOneClickWorkArea(controller) {
    const vm = controller?.viewModel || controller?.getViewModel?.();
    try {
      vm?.clearSelection?.();
    } catch (err) {
      log('One-click clear failed', err);
    }
    try {
      controller?._refreshCurrentPage?.();
    } catch (err) {
      log('One-click work area refresh failed', err);
    }
  }

  function applyOneClickSelection(controller, items) {
    const vm = controller.viewModel || controller.getViewModel?.();
    if (!vm || typeof vm.selectItem !== 'function' || typeof vm.clearSelection !== 'function') {
      return { ok: false, reason: 'Work area selection is unavailable.' };
    }
    const Tab = win.OneClickSBCWorkAreaTab;
    vm.clearSelection();
    for (const item of items) {
      const id = item?.id != null ? item.id : itemResourceId(item);
      if (id == null) continue;
      const selectable = item?.id != null ? item : Object.assign({}, item, { id });
      const tab =
        isSbcStorageItem(item) && Tab?.STORAGE != null ? Tab.STORAGE : Tab?.CLUB ?? null;
      try {
        vm._itemTabMap?.set(id, tab);
        vm._itemScoreMap?.set(id, Number(item.sbsScore) || 0);
        vm._itemEntityMap?.set(id, selectable);
      } catch (err) {
        log('One-click item register failed', err);
      }
      let selected = false;
      try {
        selected = !!vm.selectItem(selectable);
      } catch (err) {
        log('One-click selectItem failed', err);
        selected = false;
      }
      if (!selected) {
        vm.clearSelection();
        return { ok: false, reason: 'The work area rejected a player. Nothing is selected.' };
      }
    }
    try {
      controller._refreshCurrentPage?.();
    } catch (err) {
      log('One-click work area refresh failed', err);
    }
    return { ok: true, viewModel: vm };
  }

  function takeOneClickUntilRequirement(items, room, neededScore) {
    if (!(neededScore > 0)) return [];
    const take = [];
    let score = 0;
    for (const item of items || []) {
      if (take.length >= room) break;
      take.push(item);
      score += Number(item.sbsScore) || 0;
      if (score >= neededScore) break;
    }
    return take;
  }

  async function selectOneClickTemplate(challengeId) {
    const id = Number(challengeId);
    const template = oneClickTemplateFor(id);
    const steps = template.steps;
    if (!steps.length) {
      return { ok: false, reason: 'Add at least one step.' };
    }
    const controller = findOpenOneClickWorkArea(id);
    if (!controller) {
      return {
        ok: false,
        reason: 'Open this challenge’s work area first. Select does not open or submit it.',
      };
    }
    const vm = controller.viewModel || controller.getViewModel?.();
    const limit =
      typeof vm?.getSelectionLimit === 'function'
        ? Number(vm.getSelectionLimit())
        : Number(
            win.services?.Configuration?.getFeatureSetting?.(
              win.UTServerSettingsRepository?.KEY?.ONE_CLICK_SBC_SUBMIT_LIMIT
            )
          ) || 30;
    const explicit = steps.reduce((sum, step) => sum + (step.count === '' ? 0 : step.count), 0);
    if (!(limit > 0) || explicit > limit) {
      clearOneClickWorkArea(controller);
      return {
        ok: false,
        reason: `This template picks ${explicit} players. The work area allows ${limit || 0}. Nothing was selected.`,
      };
    }
    const importance = readPaletoolsImportanceLists();
    const challenge = vm?.getChallenge?.() || vm?._challenge || null;
    const submittedScore = Number(challenge?.submittedScore) || 0;
    const scoreRequirement = Number(challenge?.scoreRequirement) || 0;
    const usedIds = new Set();
    const chosen = [];
    let slotsLeft = limit;
    let explicitLeft = explicit;
    let selectedScore = 0;
    const neededScore = () =>
      scoreRequirement > 0
        ? Math.max(0, scoreRequirement - submittedScore - selectedScore)
        : null;
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      const openEnded = step.count === '';
      const needed = neededScore();
      if (openEnded && needed === 0) continue;
      const room = openEnded ? Math.max(0, slotsLeft - explicitLeft) : step.count;
      if (room <= 0) continue;
      const collected = await collectOneClickStepItems(id, step, usedIds, importance, {
        room,
        neededScore: openEnded ? needed : null,
      });
      if (collected.softban) {
        return { ok: false, softban: true, reason: 'Search stopped on a soft-ban. The work area was left as it was.' };
      }
      if (collected.missing) {
        return { ok: false, reason: 'Club search is unavailable.' };
      }
      const take =
        openEnded && needed != null
          ? takeOneClickUntilRequirement(collected.items, room, needed)
          : (collected.items || []).slice(0, room);
      if (!openEnded && take.length < step.count) {
        clearOneClickWorkArea(controller);
        return {
          ok: false,
          reason: `Step ${index + 1} needs ${step.count} players and found ${take.length}. Nothing is selected.`,
        };
      }
      if (!openEnded) explicitLeft -= step.count;
      slotsLeft -= take.length;
      for (const item of take) {
        const itemId = itemResourceId(item);
        if (itemId != null) usedIds.add(itemId);
        selectedScore += Number(item.sbsScore) || 0;
        chosen.push(item);
      }
    }
    if (!chosen.length) {
      clearOneClickWorkArea(controller);
      if (scoreRequirement > 0 && submittedScore >= scoreRequirement) {
        return {
          ok: false,
          reason: 'The requirement is already covered. Nothing else was selected.',
        };
      }
      return { ok: false, reason: 'No players matched these steps. Nothing is selected.' };
    }
    const applied = applyOneClickSelection(controller, chosen);
    if (!applied.ok) {
      clearOneClickWorkArea(controller);
      return applied;
    }
    const challengeAfter = applied.viewModel?.getChallenge?.() || challenge;
    const submittedAfter = Number(challengeAfter?.submittedScore) || submittedScore;
    const requirementAfter = Number(challengeAfter?.scoreRequirement) || scoreRequirement;
    log('One-click template selected', {
      challengeId: id,
      players: chosen.length,
      selectedScore,
      submittedScore: submittedAfter,
      scoreRequirement: requirementAfter,
    });
    return {
      ok: true,
      players: chosen.length,
      selectedScore,
      submittedScore: submittedAfter,
      scoreRequirement: requirementAfter,
    };
  }

  function fillSelect(select, options, selected, placeholder) {
    select.innerHTML = '';
    const blank = win.document.createElement('option');
    blank.value = '';
    blank.textContent = placeholder;
    select.appendChild(blank);
    for (const option of options) {
      const el = win.document.createElement('option');
      el.value = String(option.id);
      el.textContent = option.label;
      select.appendChild(el);
    }
    setSelectValue(select, selected === '' || selected == null ? '' : String(selected));
  }

  function oneClickFieldLabel(text) {
    const label = win.document.createElement('label');
    label.style.cssText = 'display:flex;flex-direction:column;gap:2px;font-size:11px;';
    const title = win.document.createElement('span');
    title.textContent = text;
    title.style.opacity = '0.8';
    label.appendChild(title);
    return label;
  }

  function readOneClickStepRow(row) {
    const value = (name) => row.querySelector(`[data-oc-field="${name}"]`)?.value;
    const checked = (name) => !!row.querySelector(`[data-oc-field="${name}"]`)?.checked;
    return normalizeOneClickStep({
      count: value('count'),
      minRating: value('minRating'),
      maxRating: value('maxRating'),
      leagueId: value('leagueId'),
      nationId: value('nationId'),
      searchSource: value('searchSource'),
      importantLeaguesOnly: checked('importantLeaguesOnly'),
      unimportantLeaguesOnly: checked('unimportantLeaguesOnly'),
      importantNationsOnly: checked('importantNationsOnly'),
      unimportantNationsOnly: checked('unimportantNationsOnly'),
      ignoreImportanceTransfer: checked('ignoreImportanceTransfer'),
      ignoreImportanceStorage: checked('ignoreImportanceStorage'),
    });
  }

  function buildOneClickStepRow(step, leagues, nations, onChange) {
    const row = win.document.createElement('div');
    row.dataset.oneClickStep = '1';
    row.style.cssText = [
      'margin:0 0 8px',
      'padding:8px',
      'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:4px',
      'background:rgba(0,0,0,0.2)',
    ].join(';');
    const grid = win.document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;';

    const countLabel = oneClickFieldLabel('Count');
    const count = win.document.createElement('input');
    count.type = 'number';
    count.min = '1';
    count.max = '30';
    count.placeholder = 'All';
    count.title = 'Leave empty to take players that fit until the score requirement is met.';
    count.value = step.count === '' || step.count == null ? '' : String(step.count);
    count.dataset.ocField = 'count';
    count.style.cssText = 'width:64px;';
    count.addEventListener('change', onChange);
    countLabel.appendChild(count);
    grid.appendChild(countLabel);

    const addNumber = (name, label, value) => {
      const wrap = oneClickFieldLabel(label);
      const input = win.document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = '99';
      input.placeholder = 'Any';
      input.value = value === '' || value == null ? '' : String(value);
      input.dataset.ocField = name;
      input.style.cssText = 'width:72px;';
      input.addEventListener('change', onChange);
      wrap.appendChild(input);
      grid.appendChild(wrap);
    };
    addNumber('minRating', 'Min rating', step.minRating);
    addNumber('maxRating', 'Max rating', step.maxRating);

    const leagueLabel = oneClickFieldLabel('League');
    const league = win.document.createElement('select');
    league.dataset.ocField = 'leagueId';
    fillSelect(league, leagues, step.leagueId, 'Any league');
    league.addEventListener('change', onChange);
    leagueLabel.appendChild(league);
    grid.appendChild(leagueLabel);

    const nationLabel = oneClickFieldLabel('Nation');
    const nation = win.document.createElement('select');
    nation.dataset.ocField = 'nationId';
    fillSelect(nation, nations, step.nationId, 'Any nation');
    nation.addEventListener('change', onChange);
    nationLabel.appendChild(nation);
    grid.appendChild(nationLabel);

    const sourceLabel = oneClickFieldLabel('Source');
    const source = win.document.createElement('select');
    source.dataset.ocField = 'searchSource';
    source.innerHTML = '';
    for (const [id, label] of oneClickSourceOptions()) {
      const option = win.document.createElement('option');
      option.value = String(id);
      option.textContent = label;
      source.appendChild(option);
    }
    setSelectValue(source, String(step.searchSource));
    source.addEventListener('change', onChange);
    sourceLabel.appendChild(source);
    grid.appendChild(sourceLabel);

    const remove = win.document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.style.cssText = 'padding:4px 8px;cursor:pointer;';
    remove.addEventListener('click', () => {
      row.remove();
      onChange();
    });
    grid.appendChild(remove);
    row.appendChild(grid);

    const toggles = win.document.createElement('div');
    toggles.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;font-size:11px;';
    const addToggle = (name, label) => {
      const wrap = win.document.createElement('label');
      wrap.style.cssText = 'display:flex;gap:4px;align-items:center;';
      const input = win.document.createElement('input');
      input.type = 'checkbox';
      input.dataset.ocField = name;
      input.checked = !!step[name];
      input.addEventListener('change', onChange);
      wrap.appendChild(input);
      wrap.appendChild(win.document.createTextNode(label));
      toggles.appendChild(wrap);
    };
    addToggle('importantLeaguesOnly', 'Important leagues only');
    addToggle('unimportantLeaguesOnly', 'Not important leagues only');
    addToggle('importantNationsOnly', 'Important nations only');
    addToggle('unimportantNationsOnly', 'Not important nations only');
    addToggle('ignoreImportanceTransfer', 'Ignore importance for Transfer List');
    addToggle('ignoreImportanceStorage', 'Ignore importance for SBC Storage');
    row.appendChild(toggles);
    return row;
  }

  function buildOneClickTemplatesPanel() {
    const panel = win.document.createElement('div');
    panel.style.cssText = 'font:13px/1.4 sans-serif;color:#f5f7fa;';
    const help = win.document.createElement('div');
    help.style.cssText = 'opacity:0.75;font-size:11px;margin-bottom:10px;line-height:1.35;';
    help.textContent =
      'Each step picks a number of players with the same filters as a squad template. Important toggles use Paletools’ important leagues and nations. Not-important toggles also use the Players tab SBC checkboxes, and a duplicate can still be used. Unlisted Transfers uses club copies of unlisted duplicates. Select fills the open work area and does not submit.';
    panel.appendChild(help);

    const challengeRow = win.document.createElement('div');
    challengeRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
    const challengeSelect = win.document.createElement('select');
    challengeSelect.id = 'companion-one-click-challenge';
    challengeSelect.style.cssText = 'flex:1;min-width:0;';
    const refresh = win.document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'Refresh';
    refresh.style.cssText = 'padding:4px 8px;cursor:pointer;';
    challengeRow.appendChild(challengeSelect);
    challengeRow.appendChild(refresh);
    panel.appendChild(challengeRow);

    const requirement = win.document.createElement('div');
    requirement.style.cssText = 'font-size:12px;margin-bottom:8px;color:#d4c4ff;';
    panel.appendChild(requirement);

    const stepsHost = win.document.createElement('div');
    stepsHost.style.cssText = 'max-height:52vh;overflow:auto;margin-bottom:8px;';
    panel.appendChild(stepsHost);

    const actions = win.document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;';
    const addStep = win.document.createElement('button');
    addStep.type = 'button';
    addStep.textContent = 'Add step';
    const save = win.document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save';
    const selectPlayers = win.document.createElement('button');
    selectPlayers.type = 'button';
    selectPlayers.textContent = 'Select';
    for (const button of [addStep, save, selectPlayers]) {
      button.style.cssText = 'padding:6px 10px;cursor:pointer;';
      actions.appendChild(button);
    }
    panel.appendChild(actions);

    const status = win.document.createElement('div');
    status.style.cssText = 'font-size:12px;line-height:1.35;min-height:1.2em;';
    panel.appendChild(status);

    const leagues = getLeagueOptions();
    const nations = getNationOptions();
    let challenges = listLoadedOneClickChallenges();
    let currentId = '';

    const setStatus = (text) => {
      status.textContent = text || '';
    };

    const currentSteps = () =>
      [...stepsHost.querySelectorAll('[data-one-click-step]')].map(readOneClickStepRow);

    const persist = () => {
      if (!currentId) return;
      saveOneClickTemplate(currentId, currentSteps());
    };

    const renderSteps = (steps) => {
      stepsHost.innerHTML = '';
      const list = steps.length ? steps : [];
      for (const step of list) {
        stepsHost.appendChild(buildOneClickStepRow(step, leagues, nations, persist));
      }
    };

    const showChallenge = () => {
      const row = challenges.find((entry) => String(entry.challengeId) === String(currentId));
      if (!row) {
        requirement.textContent = challenges.length
          ? 'Choose a one-click challenge.'
          : 'No one-click challenges are loaded. Open the SBC hub or press Refresh.';
        return;
      }
      requirement.textContent = `${row.label} — requirement ${row.scoreRequirement}, already submitted ${row.submittedScore}.`;
    };

    const renderChallenges = () => {
      challengeSelect.innerHTML = '';
      const none = win.document.createElement('option');
      none.value = '';
      none.textContent = challenges.length ? 'Choose a challenge' : 'No one-click challenges loaded';
      challengeSelect.appendChild(none);
      for (const row of challenges) {
        const option = win.document.createElement('option');
        option.value = String(row.challengeId);
        option.textContent = row.label;
        challengeSelect.appendChild(option);
      }
      if (currentId && !challenges.some((row) => String(row.challengeId) === String(currentId))) {
        currentId = '';
      }
      setSelectValue(challengeSelect, currentId);
      showChallenge();
    };

    const loadChallenge = (challengeId) => {
      currentId = challengeId ? String(challengeId) : '';
      renderSteps(currentId ? oneClickTemplateFor(currentId).steps : []);
      showChallenge();
      setStatus('');
    };

    challengeSelect.addEventListener('change', () => {
      persist();
      loadChallenge(challengeSelect.value);
    });
    addStep.addEventListener('click', () => {
      if (!currentId) {
        setStatus('Choose a challenge first.');
        return;
      }
      stepsHost.appendChild(
        buildOneClickStepRow(defaultOneClickStep(), leagues, nations, persist)
      );
      persist();
    });
    save.addEventListener('click', () => {
      if (!currentId) {
        setStatus('Choose a challenge first.');
        return;
      }
      persist();
      setStatus('Template saved.');
    });
    refresh.addEventListener('click', async () => {
      refresh.disabled = true;
      setStatus('Loading one-click challenges…');
      try {
        const result = await refreshOneClickChallengeCatalog();
        challenges = result.challenges || listLoadedOneClickChallenges();
        renderChallenges();
        setStatus(
          result.softban
            ? 'Stopped loading challenges on a soft-ban.'
            : `Loaded ${challenges.length} one-click challenges.`
        );
      } catch (err) {
        warn('One-click challenge refresh failed', err);
        setStatus('Could not load challenges.');
      } finally {
        refresh.disabled = false;
      }
    });
    selectPlayers.addEventListener('click', async () => {
      if (panel.__selecting) return;
      if (!currentId) {
        setStatus('Choose a challenge first.');
        return;
      }
      persist();
      panel.__selecting = true;
      selectPlayers.disabled = true;
      setStatus('Selecting players…');
      try {
        const result = await selectOneClickTemplate(currentId);
        setStatus(describeOneClickSelectResult(result));
      } catch (err) {
        warn('One-click template select failed', err);
        setStatus('Select failed. Nothing was submitted.');
      } finally {
        panel.__selecting = false;
        selectPlayers.disabled = false;
      }
    });

    renderChallenges();
    return panel;
  }

  function openStandaloneCompanionEditor() {
    win.document.getElementById('companion-settings-modal')?.remove();

    const modal = win.document.createElement('div');
    modal.id = 'companion-settings-modal';
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:100000',
      'background:rgba(0,0,0,0.55)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');

    const card = win.document.createElement('div');
    card.style.cssText = [
      'width:min(640px,96vw)',
      'max-height:85vh',
      'overflow:auto',
      'background:#1b1f24',
      'color:#f5f7fa',
      'padding:16px',
      'border-radius:8px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.45)',
      'font:13px/1.4 sans-serif',
    ].join(';');
    const companionTabs = [
      {
        id: 'companion-tab-pack-rules',
        panelId: 'companion-tab-pack-rules-panel',
        label: 'Pack Opener',
        accent: '#4ee6eb',
        ink: '#042326',
      },
      {
        id: 'companion-tab-players',
        panelId: 'companion-tab-players-panel',
        label: 'Players',
        accent: '#7dffb3',
        ink: '#042216',
      },
      {
        id: 'companion-tab-managers',
        panelId: 'companion-tab-managers-panel',
        label: 'Managers',
        accent: '#ffd166',
        ink: '#2a2106',
      },
      {
        id: 'companion-tab-club',
        panelId: 'companion-tab-club-panel',
        label: 'Club scan',
        accent: '#d4c4ff',
        ink: '#1c1433',
      },
      {
        id: 'companion-tab-one-click',
        panelId: 'companion-tab-one-click-panel',
        label: 'SBC templates',
        accent: '#9ad1ff',
        ink: '#062033',
      },
    ];
    const headerButtonStyle = [
      'cursor:pointer',
      'padding:6px 10px',
      'border-radius:4px',
      'border:1px solid #8b98a8',
      'background:#2c3440',
      'color:#f5f7fa',
      'font:600 12px/1.2 sans-serif',
    ].join(';');
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">
        <strong style="color:#f5f7fa;font-size:15px;">Paletools Companion</strong>
        <span style="display:flex;gap:8px;">
          <button type="button" id="companion-copy-debug-log" style="${headerButtonStyle}">Copy debug log</button>
          <button type="button" id="companion-settings-close" style="${headerButtonStyle}">Close</button>
        </span>
      </div>
      <div role="tablist" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        ${companionTabs
          .map(
            (tab) =>
              `<button type="button" role="tab" id="${tab.id}" data-accent="${tab.accent}" data-ink="${tab.ink}" aria-controls="${tab.panelId}">${tab.label}</button>`
          )
          .join('')}
      </div>
      <div id="companion-tab-pack-rules-panel"></div>
      <div id="companion-tab-players-panel" style="display:none;"></div>
      <div id="companion-tab-managers-panel" style="display:none;"></div>
      <div id="companion-tab-club-panel" style="display:none;"></div>
      <div id="companion-tab-one-click-panel" style="display:none;"></div>
    `;

    const paintCompanionTab = (button, active) => {
      const accent = button.dataset.accent;
      const ink = button.dataset.ink;
      button.style.cssText = [
        'cursor:pointer',
        'flex:1 1 140px',
        'padding:8px 10px',
        'border-radius:6px',
        'border:2px solid ' + accent,
        'font:700 13px/1.2 sans-serif',
        active
          ? `background:${accent};color:${ink}`
          : `background:#12161c;color:${accent}`,
      ].join(';');
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    };

    const packRulesPanel = card.querySelector('#companion-tab-pack-rules-panel');
    const playersPanel = card.querySelector('#companion-tab-players-panel');
    const managersPanel = card.querySelector('#companion-tab-managers-panel');
    const clubPanel = card.querySelector('#companion-tab-club-panel');
    const oneClickPanel = card.querySelector('#companion-tab-one-click-panel');
    const tabPanels = [packRulesPanel, playersPanel, managersPanel, clubPanel, oneClickPanel];
    const tabButtons = companionTabs.map((tab) => card.querySelector(`#${tab.id}`));
    const showTab = (active) => {
      tabPanels.forEach((panel, index) => {
        const on = panel === active;
        panel.style.display = on ? '' : 'none';
        paintCompanionTab(tabButtons[index], on);
      });
    };

    packRulesPanel.appendChild(
      buildPackRulesPanel({
        id: 'companion-pack-rules-modal',
        undercutInputId: 'companion-undercuts-modal',
      })
    );
    playersPanel.appendChild(
      buildLeaguesEditor({
        filterId: 'companion-league-filter-players',
        listId: 'companion-league-list-players',
        countId: 'companion-league-count-players',
        totalId: 'companion-league-total-players',
        compact: true,
        audience: 'players',
      })
    );
    playersPanel.appendChild(
      buildNationsEditor({
        filterId: 'companion-nation-filter-players',
        listId: 'companion-nation-list-players',
        countId: 'companion-nation-count-players',
        totalId: 'companion-nation-total-players',
        compact: true,
        audience: 'players',
      })
    );
    managersPanel.appendChild(
      buildLeaguesEditor({
        filterId: 'companion-league-filter-managers',
        listId: 'companion-league-list-managers',
        countId: 'companion-league-count-managers',
        totalId: 'companion-league-total-managers',
        compact: true,
        audience: 'managers',
      })
    );
    managersPanel.appendChild(
      buildNationsEditor({
        filterId: 'companion-nation-filter-managers',
        listId: 'companion-nation-list-managers',
        countId: 'companion-nation-count-managers',
        totalId: 'companion-nation-total-managers',
        compact: true,
        audience: 'managers',
      })
    );
    clubPanel.appendChild(
      buildClubFloorSettingEditor({ inputId: 'companion-club-floor-modal' })
    );
    oneClickPanel.appendChild(buildOneClickTemplatesPanel());

    card
      .querySelector('#companion-tab-pack-rules')
      .addEventListener('click', () => showTab(packRulesPanel));
    card
      .querySelector('#companion-tab-players')
      .addEventListener('click', () => showTab(playersPanel));
    card
      .querySelector('#companion-tab-managers')
      .addEventListener('click', () => showTab(managersPanel));
    card
      .querySelector('#companion-tab-club')
      .addEventListener('click', () => showTab(clubPanel));
    card
      .querySelector('#companion-tab-one-click')
      .addEventListener('click', () => showTab(oneClickPanel));
    showTab(packRulesPanel);

    modal.appendChild(card);
    (win.document.body || win.document.documentElement).appendChild(modal);

    const close = () => modal.remove();
    card
      .querySelector('#companion-settings-close')
      .addEventListener('click', close);
    card.querySelector('#companion-copy-debug-log').addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      copyDebugLog();
    });
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) close();
    });
  }

  function oneClickWorkAreaChallenge(controller) {
    const vm = controller?.viewModel || controller?.getViewModel?.();
    const challenge = vm?.getChallenge?.() || vm?._challenge;
    const set = vm?.getSet?.() || vm?._set;
    const id = Number(challenge?.id);
    if (!(id > 0)) return null;
    const name = sbcOptionTitle(set, challenge);
    return {
      id,
      name: name || challenge?.name || `Challenge ${id}`,
      setId: Number(set?.id) || null,
    };
  }

  function describeOneClickSelectResult(result) {
    if (!result) return 'Nothing was selected.';
    if (result.softban || !result.ok) return result.reason || 'Nothing was selected.';
    const total = result.submittedScore + result.selectedScore;
    const covered = result.scoreRequirement > 0 && total >= result.scoreRequirement;
    return `Selected ${result.players} players. Score ${result.selectedScore} plus ${result.submittedScore} already submitted is ${total} / ${result.scoreRequirement}. ${
      covered ? 'The requirement is covered.' : 'The requirement is not covered yet.'
    } Submit it from the work area when you want to.`;
  }

  function openOneClickTemplateEditor(challengeId, challengeName) {
    const id = String(challengeId);
    const existing = win.document.getElementById('companion-one-click-editor');
    if (existing) existing.remove();
    const overlay = win.document.createElement('div');
    overlay.id = 'companion-one-click-editor';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';
    const card = win.document.createElement('div');
    card.style.cssText =
      'width:min(720px,94vw);max-height:86vh;overflow:auto;background:#1b1e24;color:#e8e8e8;border-radius:8px;padding:14px 16px;box-shadow:0 8px 32px rgba(0,0,0,0.45);';
    const title = win.document.createElement('div');
    title.textContent = `Edit template — ${challengeName}`;
    title.style.cssText = 'font-size:15px;font-weight:600;margin:0 0 8px;';
    const note = win.document.createElement('p');
    note.textContent =
      'Same filters as a squad template. Select from Template checks the players on this challenge. It does not submit.';
    note.style.cssText = 'margin:0 0 10px;font-size:12px;opacity:0.8;';
    const status = win.document.createElement('div');
    status.style.cssText = 'min-height:1.2em;margin:8px 0;font-size:12px;';
    const stepsHost = win.document.createElement('div');
    const leagues = getLeagueOptions();
    const nations = getNationOptions();
    const persist = () => {
      const steps = [...stepsHost.querySelectorAll('[data-one-click-step]')].map(readOneClickStepRow);
      saveOneClickTemplate(id, steps);
    };
    const template = oneClickTemplateFor(id);
    const steps = template.steps.length ? template.steps : [defaultOneClickStep()];
    for (const step of steps) {
      stepsHost.appendChild(buildOneClickStepRow(step, leagues, nations, persist));
    }
    const actions = win.document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;';
    const add = win.document.createElement('button');
    add.type = 'button';
    add.textContent = 'Add step';
    const save = win.document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save';
    const close = win.document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    for (const button of [add, save, close]) {
      button.style.cssText = 'padding:6px 10px;cursor:pointer;';
    }
    add.addEventListener('click', () => {
      stepsHost.appendChild(buildOneClickStepRow(defaultOneClickStep(), leagues, nations, persist));
      persist();
    });
    save.addEventListener('click', () => {
      persist();
      status.textContent = 'Template saved.';
    });
    close.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.remove();
    });
    actions.append(add, save, close);
    card.append(title, note, stepsHost, status, actions);
    overlay.appendChild(card);
    win.document.body.appendChild(overlay);
  }

  function ensureOneClickChallengeButtons(controller) {
    const challenge = oneClickWorkAreaChallenge(controller);
    if (challenge) rememberOneClickTemplateName(challenge.id, challenge.name, challenge.setId);
    const root = controller?.getView?.()?.getRootElement?.();
    if (!root || root.querySelector('[data-companion-one-click-edit]')) return;
    const actions = root.querySelector('.ut-one-click-sbc-work-area-view--toolbar-actions');
    if (!actions) return;
    const buttonStyle = 'margin-left:6px;padding:4px 8px;cursor:pointer;font-size:12px;';
    const edit = win.document.createElement('button');
    edit.type = 'button';
    edit.dataset.companionOneClickEdit = '1';
    edit.textContent = 'Edit Template';
    edit.style.cssText = buttonStyle;
    const select = win.document.createElement('button');
    select.type = 'button';
    select.dataset.companionOneClickSelect = '1';
    select.textContent = 'Select from Template';
    select.style.cssText = buttonStyle;
    const status = win.document.createElement('div');
    status.dataset.companionOneClickStatus = '1';
    status.style.cssText = 'padding:4px 12px 0;font-size:12px;min-height:1.1em;';
    actions.append(edit, select);
    const toolbar = root.querySelector('.ut-one-click-sbc-work-area-view--toolbar');
    if (toolbar) toolbar.insertAdjacentElement('afterend', status);
    else root.appendChild(status);

    edit.addEventListener('click', () => {
      const challenge = oneClickWorkAreaChallenge(controller);
      if (!challenge) {
        status.textContent = 'This challenge is not available.';
        return;
      }
      openOneClickTemplateEditor(challenge.id, challenge.name);
    });
    select.addEventListener('click', async () => {
      if (select.disabled) return;
      const challenge = oneClickWorkAreaChallenge(controller);
      if (!challenge) {
        status.textContent = 'This challenge is not available.';
        return;
      }
      select.disabled = true;
      status.textContent = 'Selecting players…';
      try {
        const result = await selectOneClickTemplate(challenge.id);
        status.textContent = describeOneClickSelectResult(result);
      } catch (err) {
        warn('One-click template select failed', err);
        status.textContent = 'Select failed. Nothing was submitted.';
      } finally {
        select.disabled = false;
      }
    });
  }

  function installOneClickChallengePageButtons() {
    const Proto = win.UTOneClickSBCWorkAreaViewController?.prototype;
    if (
      Proto &&
      typeof Proto.viewDidAppear === 'function' &&
      !Proto.viewDidAppear.__companionOneClickButtons
    ) {
      const original = Proto.viewDidAppear;
      Proto.viewDidAppear = function () {
        const result = original.apply(this, arguments);
        try {
          ensureOneClickChallengeButtons(this);
        } catch (err) {
          log('One-click challenge buttons failed', err);
        }
        return result;
      };
      Proto.viewDidAppear.__companionOneClickButtons = true;
      log('One-click challenge page buttons installed');
    }
    const Controller = win.UTOneClickSBCWorkAreaViewController;
    if (typeof Controller !== 'function') return false;
    try {
      walkViewControllers((controller) => {
        try {
          if (controller instanceof Controller) ensureOneClickChallengeButtons(controller);
        } catch {
          /* not this controller */
        }
      });
    } catch (err) {
      log('One-click challenge button scan failed', err);
    }
    return true;
  }

  function processDomMutation() {
    if (state.companionDomWrite || state.enhancingDialog) return;

    installPaletoolsFindLowestCapture();
    enhancePackOpenerDialog();
    ensureFloatingEntry();
    ensureStorePackTemplates();
    ensureEarlyStopButton();
    ensureClubScanButton();
    if (state.clubScanRunning || state.clubScanStats?.total) {
      ensureClubScanPanel();
      updateClubScanPanel();
    }
    if (state.packOpenerRunning) {
      ensureLivePackSummaryPanel();
      updateLivePackSummaryPanel();
    }

    const resultsVisible = !!(
      win.document.querySelector('.pack-opener-results') ||
      win.document.querySelector('.pack-opener-result') ||
      win.document.querySelector('.pack-opener-results-summary')
    );

    if (resultsVisible && state.packOpenerRunning) {
      resetEarlyStopState();
    }

    if (
      (state.pendingTransferCount || state.pendingListedEntries.length) &&
      resultsVisible
    ) {
      applyPendingCompanionRecap();
    }
  }

  function onDomMutated() {
    // Debounce: Pack Opener + our checkbox panels create large childList bursts.
    // Running enhance synchronously on every mutation freezes the page.
    if (state.companionDomWrite || state.enhancingDialog) return;
    if (state.domMutateTimer != null) return;
    state.domMutateTimer = win.setTimeout(() => {
      state.domMutateTimer = null;
      try {
        processDomMutation();
      } catch (err) {
        warn('DOM mutate handler error', err);
      }
    }, 150);
  }

  // ---------------------------------------------------------------------------
  // SBC Template Builder — Unlisted Transfers search-source options
  // Paletools ships Storage/Club combinations (values 1–4). Companion adds
  // transfer-first combinations (values 5–9) and merges unlisted TL players.
  // ---------------------------------------------------------------------------
  const SBC_SEARCH_SOURCE = {
    STORAGE: 1,
    CLUB: 2,
    STORAGE_CLUB: 3,
    CLUB_STORAGE: 4,
    TRANSFER_STORAGE_CLUB: 5,
    TRANSFER_STORAGE: 6,
    TRANSFER_CLUB: 7,
    TRANSFER_CLUB_STORAGE: 8,
    TRANSFER: 9,
  };

  /**
   * Map transfer* UI sources → Paletools Storage/Club search mode.
   * Unlisted TL cards are only a definitionId priority signal; SBC always gets
   * club/storage copies (TL pile items cannot be assigned to an SBC squad).
   *
   * Important: Paletools searchSource=CLUB (2) is NOT a normal club search — it
   * starts from an empty list and fills storage/concepts. Mapping Transfer* to
   * CLUB therefore never surfaces club copies of TL players. Use STORAGE_CLUB
   * (Item/Club search + merge) for any transfer combo that needs club players.
   */
  const TRANSFER_SOURCE_BASE = {
    [SBC_SEARCH_SOURCE.TRANSFER_STORAGE_CLUB]: SBC_SEARCH_SOURCE.STORAGE_CLUB,
    [SBC_SEARCH_SOURCE.TRANSFER_STORAGE]: SBC_SEARCH_SOURCE.STORAGE,
    [SBC_SEARCH_SOURCE.TRANSFER_CLUB]: SBC_SEARCH_SOURCE.STORAGE_CLUB,
    [SBC_SEARCH_SOURCE.TRANSFER_CLUB_STORAGE]: SBC_SEARCH_SOURCE.CLUB_STORAGE,
    // Transfer-only is handled by delivering club copies directly; base is fallback
    [SBC_SEARCH_SOURCE.TRANSFER]: SBC_SEARCH_SOURCE.STORAGE_CLUB,
  };

  function localizeSearchMode(key, fallback) {
    try {
      const loc = win.services?.Localization;
      const localize =
        (typeof loc?.localize === 'function' && loc.localize.bind(loc)) ||
        (typeof loc?.getString === 'function' && loc.getString.bind(loc)) ||
        null;
      if (localize) {
        const name = localize(key);
        if (name && typeof name === 'string') {
          const trimmed = name.trim();
          if (trimmed && !trimmed.startsWith('*') && trimmed !== key) {
            return trimmed;
          }
        }
      }
    } catch {
      /* ignore */
    }
    return fallback;
  }

  function getSbcSearchModeLabels() {
    const storage = localizeSearchMode(
      'search.searchmode.storage',
      'SBC Storage'
    );
    const club = localizeSearchMode('search.searchmode.club', 'My Club');
    const transfer = localizeSearchMode(
      'search.searchmode.transfer',
      localizeSearchMode(
        'search.searchmode.transferlist',
        localizeSearchMode('transferlist.header', 'Unlisted Transfers')
      )
    );
    const join = (...parts) => parts.join(' / ');
    return {
      storage,
      club,
      transfer,
      transferStorageClub: join(transfer, storage, club),
      transferStorage: join(transfer, storage),
      transferClub: join(transfer, club),
      transferClubStorage: join(transfer, club, storage),
    };
  }

  function isPaletoolsStorageClubSourceOptions(options) {
    if (!Array.isArray(options) || options.length < 4) return false;
    const values = new Set(
      options.map((opt) => Number(opt?.value ?? opt?.id))
    );
    return (
      values.has(SBC_SEARCH_SOURCE.STORAGE) &&
      values.has(SBC_SEARCH_SOURCE.CLUB) &&
      values.has(SBC_SEARCH_SOURCE.STORAGE_CLUB) &&
      values.has(SBC_SEARCH_SOURCE.CLUB_STORAGE)
    );
  }

  function alreadyHasTransferSourceOptions(options) {
    return options.some(
      (opt) => Number(opt?.value ?? opt?.id) === SBC_SEARCH_SOURCE.TRANSFER
    );
  }

  function expandSearchSourceOptions(options) {
    if (
      !isPaletoolsStorageClubSourceOptions(options) ||
      alreadyHasTransferSourceOptions(options)
    ) {
      return options;
    }
    const labels = getSbcSearchModeLabels();
    const extras = [
      {
        id: SBC_SEARCH_SOURCE.TRANSFER_STORAGE_CLUB,
        value: SBC_SEARCH_SOURCE.TRANSFER_STORAGE_CLUB,
        label: labels.transferStorageClub,
      },
      {
        id: SBC_SEARCH_SOURCE.TRANSFER_STORAGE,
        value: SBC_SEARCH_SOURCE.TRANSFER_STORAGE,
        label: labels.transferStorage,
      },
      {
        id: SBC_SEARCH_SOURCE.TRANSFER_CLUB,
        value: SBC_SEARCH_SOURCE.TRANSFER_CLUB,
        label: labels.transferClub,
      },
      {
        id: SBC_SEARCH_SOURCE.TRANSFER_CLUB_STORAGE,
        value: SBC_SEARCH_SOURCE.TRANSFER_CLUB_STORAGE,
        label: labels.transferClubStorage,
      },
      {
        id: SBC_SEARCH_SOURCE.TRANSFER,
        value: SBC_SEARCH_SOURCE.TRANSFER,
        label: labels.transfer,
      },
    ];
    log('Expanded SBC template search sources with Unlisted Transfers');
    return options.concat(extras);
  }

  function installSearchSourceDropdownHook() {
    const DropDown = win.UTDropDownControl;
    if (!DropDown?.prototype?.setOptions) return false;
    if (DropDown.prototype.setOptions.__companionTransferSources) return true;

    const original = DropDown.prototype.setOptions;
    function companionSetOptions(options, ...rest) {
      try {
        if (Array.isArray(options)) {
          options = expandSearchSourceOptions(options);
        }
      } catch (err) {
        warn('search-source setOptions expand failed', err);
      }
      return original.call(this, options, ...rest);
    }
    companionSetOptions.__companionTransferSources = true;
    DropDown.prototype.setOptions = companionSetOptions;
    log('UTDropDownControl.setOptions hook installed (SBC transfer sources)');
    return true;
  }

  function definitionIdOf(item) {
    const direct = Number(item?.definitionId ?? item?._definitionId);
    if (Number.isFinite(direct) && direct > 0) return direct;
    try {
      if (typeof item?.getDefinitionId === 'function') {
        const n = Number(item.getDefinitionId());
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch {
      /* ignore */
    }
    const ownId = Number(item?.id);
    const resource = Number(item?.resourceId);
    if (Number.isFinite(resource) && resource > 0 && resource !== ownId) return resource;
    const asset = Number(item?.assetId ?? item?._assetId);
    if (Number.isFinite(asset) && asset > 0) return asset;
    const meta = Number(item?._meta?.id);
    return Number.isFinite(meta) && meta > 0 ? meta : null;
  }

  function isLikelyPlayerItem(item) {
    if (!item) return false;
    if (isPlayer(item)) return true;
    try {
      if (win.ItemType && item.type === win.ItemType.PLAYER) return true;
    } catch {
      /* ignore */
    }
    // Transfer-list rows sometimes omit isPlayer() but still have a definitionId
    return definitionIdOf(item) != null;
  }

  /** Same rule Paletools uses: unlisted ⇒ !getAuctionData().isValid() */
  function isUnlistedTransferItem(item) {
    if (!isLikelyPlayerItem(item)) return false;
    try {
      const auction =
        typeof item.getAuctionData === 'function'
          ? item.getAuctionData()
          : item._auctionData || item.auctionData;
      if (auction && typeof auction.isValid === 'function') {
        return !auction.isValid();
      }
    } catch {
      /* ignore */
    }
    // No auction payload — treat as unlisted TL sitting item
    return true;
  }

  function getItemRatingSafe(item) {
    try {
      if (typeof item.getRating === 'function') {
        const r = Number(item.getRating());
        if (Number.isFinite(r) && r > 0) return r;
      }
    } catch {
      /* ignore */
    }
    try {
      const staticData =
        typeof item.getStaticData === 'function' ? item.getStaticData() : item._staticData;
      const fromStatic = Number(staticData?.rating ?? staticData?.overall);
      if (Number.isFinite(fromStatic) && fromStatic > 0) return fromStatic;
    } catch {
      /* ignore */
    }
    const r = Number(item?.rating ?? item?._rating ?? item?.overall ?? item?.averageRating);
    return Number.isFinite(r) && r > 0 ? r : null;
  }

  function criteriaHasBound(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
  }

  function itemMatchesSearchCriteria(item, criteria) {
    if (!item || !criteria) return true;
    const rating = getItemRatingSafe(item);
    const ovrMin = criteria.ovrMin ?? criteria.minRating;
    const ovrMax = criteria.ovrMax ?? criteria.maxRating;
    const ratingBounded = criteriaHasBound(ovrMin) || criteriaHasBound(ovrMax);
    if (ratingBounded && rating == null) return false;
    if (criteriaHasBound(ovrMin) && rating < Number(ovrMin)) return false;
    if (criteriaHasBound(ovrMax) && rating > Number(ovrMax)) return false;
    const nationId = criteria.nation ?? criteria.nationId;
    if (criteriaHasBound(nationId) && getNationId(item) !== Number(nationId)) {
      return false;
    }
    const leagueId = criteria.league ?? criteria.leagueId;
    if (criteriaHasBound(leagueId) && getLeagueId(item) !== Number(leagueId)) {
      return false;
    }
    return true;
  }

  function extractItemsFromObserveResponse(response) {
    if (!response) return [];
    if (Array.isArray(response.response?.items)) return response.response.items;
    if (Array.isArray(response.items)) return response.items;
    if (Array.isArray(response)) return response;
    return [];
  }

  function rareflagOf(item) {
    if (!item) return null;
    const raw =
      item.rareflag ??
      item.rareFlag ??
      item._rareflag ??
      (typeof item.getRareflag === 'function' ? item.getRareflag() : null);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function isConceptItem(item) {
    if (!item) return true;
    try {
      if (typeof item.isConcept === 'function' && item.isConcept()) return true;
    } catch {
      /* ignore */
    }
    return !!(item.concept || item.isConcept === true);
  }

  /**
   * Unlisted transfer-list players (same source as Paletools "use transfer list
   * players"). Criteria are not applied here — filter club copies later.
   */
  async function fetchUnlistedTransferPlayers() {
    const services = win.services;
    if (typeof services?.Item?.requestTransferItems !== 'function') {
      log('requestTransferItems unavailable');
      return [];
    }
    try {
      const response = await toPromise(services.Item.requestTransferItems());
      const items = extractItemsFromObserveResponse(response);
      const players = [];
      let listedSkipped = 0;
      for (const item of items) {
        if (!isLikelyPlayerItem(item)) continue;
        if (!isUnlistedTransferItem(item)) {
          listedSkipped++;
          continue;
        }
        if (definitionIdOf(item) == null) continue;
        players.push(item);
      }
      log('Unlisted TL players', {
        transferItems: items.length,
        unlistedPlayers: players.length,
        listedSkipped,
        success: response?.success,
      });
      return players;
    } catch (err) {
      log('requestTransferItems failed', err);
      return [];
    }
  }

  function definitionIdsFromPlayers(players) {
    const ids = [];
    const seen = new Set();
    for (const item of players || []) {
      const id = definitionIdOf(item);
      if (id == null || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }

  /** Paletools-style Club.search criteria keyed by definitionId list. */
  function newDefIdClubSearchCriteria(defIds) {
    let criteria = null;
    try {
      if (typeof win.UTItemSearchViewModel === 'function') {
        const vm = new win.UTItemSearchViewModel();
        criteria = vm.searchCriteria || null;
      }
    } catch {
      /* ignore */
    }
    if (!criteria && typeof win.UTSearchCriteriaDTO === 'function') {
      try {
        criteria = new win.UTSearchCriteriaDTO();
      } catch {
        criteria = {};
      }
    }
    if (!criteria) criteria = {};
    try {
      if (win.SearchType?.PLAYER != null) criteria.type = win.SearchType.PLAYER;
    } catch {
      /* ignore */
    }
    const ids = [...new Set((defIds || []).map(Number).filter(Number.isFinite))];
    criteria.defId = ids.slice();
    criteria.count = Math.max(ids.length, 50);
    try {
      if (win.PileSearchType?.CLUB != null) criteria.pileSearchType = win.PileSearchType.CLUB;
    } catch {
      /* ignore */
    }
    if (typeof criteria.offset === 'number') criteria.offset = 0;
    try {
      if (win.SearchSortType?.OVERALL != null) {
        criteria.sortBy = win.SearchSortType.OVERALL;
      } else if (win.SearchSortType?.RATING != null) {
        criteria.sortBy = win.SearchSortType.RATING;
      }
      if (win.SearchSortOrder?.ASCENDING != null) {
        criteria.sort = win.SearchSortOrder.ASCENDING;
      }
    } catch {
      /* ignore */
    }
    return criteria;
  }

  function collectClubItemsFromRepository() {
    const items = [];
    try {
      const repo = win.repositories?.Item;
      const pile = win.ItemPile?.CLUB;
      if (!repo || pile == null) return items;
      const candidates = [
        typeof repo.getAllItems === 'function' ? repo.getAllItems(pile) : null,
        typeof repo.getItems === 'function' ? repo.getItems(pile) : null,
        typeof repo.getPileItems === 'function' ? repo.getPileItems(pile) : null,
        Array.isArray(repo.items) ? repo.items : null,
      ];
      for (const raw of candidates) {
        if (!raw) continue;
        const list = Array.isArray(raw)
          ? raw
          : typeof raw.values === 'function'
            ? [...raw.values()]
            : Object.values(raw);
        for (const item of list) {
          if (isLikelyPlayerItem(item)) items.push(item);
        }
        if (items.length) break;
      }
    } catch (err) {
      log('Club repository scan failed', err);
    }
    return items;
  }

  /**
   * Club copies for TL definitionIds (Paletools transferListToSbc style).
   * Optional template criteria filter (rating / nation / league).
   * Prefers rareflag match when the TL card exposes one.
   */
  async function resolveClubCopiesForTransferPlayers(tlPlayers, criteria) {
    const Club = win.services?.Club;
    const players = tlPlayers || [];
    const ids = definitionIdsFromPlayers(players);
    if (!ids.length) return [];

    const rareByDefId = new Map();
    const preferIdByDef = new Map();
    for (const tl of players) {
      const id = definitionIdOf(tl);
      if (id == null) continue;
      const dup = duplicateIdOf(tl);
      if (dup > 0 && !preferIdByDef.has(id)) preferIdByDef.set(id, dup);
      if (rareByDefId.has(id)) continue;
      const rare = rareflagOf(tl);
      if (rare != null) rareByDefId.set(id, rare);
    }

    const found = []; // { item, defId, rareOk }
    const idSet = new Set(ids);

    function consider(item) {
      if (!item || isConceptItem(item)) return;
      if (item.upgrades) return;
      const id = definitionIdOf(item);
      if (id == null || !idSet.has(id)) return;
      if (!itemMatchesSearchCriteria(item, criteria)) return;
      const wantRare = rareByDefId.get(id);
      const gotRare = rareflagOf(item);
      const rareOk =
        wantRare == null || gotRare == null || wantRare === gotRare;
      found.push({ item, defId: id, rareOk });
    }

    async function searchClubByDefIds(batch) {
      if (!batch.length || typeof Club?.search !== 'function') return;
      await pace('move');
      try {
        const batchCriteria = newDefIdClubSearchCriteria(batch);
        const batchResponse = await toPromise(Club.search(batchCriteria));
        for (const item of extractItemsFromObserveResponse(batchResponse)) {
          consider(item);
        }
      } catch (err) {
        log('Club.search batch by defId failed', { count: batch.length, err });
        if (batch.length <= 10) return;
        const mid = Math.ceil(batch.length / 2);
        await searchClubByDefIds(batch.slice(0, mid));
        await searchClubByDefIds(batch.slice(mid));
      }
    }

    const CHUNK = 10;
    for (let i = 0; i < ids.length; i += CHUNK) {
      await searchClubByDefIds(ids.slice(i, i + CHUNK));
    }

    if (!found.length) {
      for (const item of collectClubItemsFromRepository()) consider(item);
    }

    // Prefer rareflag matches; one club copy per definitionId; TL order
    const byId = new Map();
    for (const entry of found) {
      const preferred = preferIdByDef.get(entry.defId);
      const linked = preferred != null && itemResourceId(entry.item) === preferred;
      const prev = byId.get(entry.defId);
      if (!prev || (linked && !prev.linked) || (!prev.linked && entry.rareOk && !prev.rareOk)) {
        byId.set(entry.defId, { ...entry, linked });
      }
    }
    const ordered = [];
    for (const defId of ids) {
      if (byId.has(defId)) ordered.push(byId.get(defId).item);
    }
    let linked = 0;
    for (const item of ordered) {
      const preferred = preferIdByDef.get(definitionIdOf(item));
      if (preferred != null && itemResourceId(item) === preferred) linked += 1;
    }
    log('Resolved club copies for unlisted TL players', {
      tlPlayers: players.length,
      requested: ids.length,
      resolved: ordered.length,
      linked,
      viaClubSearch: typeof Club?.search === 'function',
      criteriaFiltered: !!criteria,
    });
    return ordered;
  }

  function getControllerViewModel(controller) {
    if (!controller) return null;
    const direct =
      controller.viewModel || controller._viewmodel || controller._viewModel;
    if (direct?.searchSettings || direct?.searchCriteria) return direct;
    try {
      for (const key of Object.keys(controller)) {
        const v = controller[key];
        if (
          v &&
          typeof v === 'object' &&
          (v.searchSettings != null || v.searchCriteria != null)
        ) {
          return v;
        }
      }
    } catch {
      /* ignore */
    }
    return direct || null;
  }

  function getSearchSettings(controller) {
    const vm = getControllerViewModel(controller);
    return vm?.searchSettings || vm?._searchSettings || null;
  }

  function getSearchCriteria(controller) {
    const vm = getControllerViewModel(controller);
    return vm?.searchCriteria || vm?._searchCriteria || null;
  }

  function mergePlayersPreferFirst(preferred, rest) {
    const out = [];
    const seen = new Set();
    for (const item of [...(preferred || []), ...(rest || [])]) {
      if (!item) continue;
      const id = definitionIdOf(item);
      const key = id != null ? `d:${id}` : `r:${out.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  /**
   * Reorder club/storage hits so definitionIds from unlisted TL come first.
   */
  function prioritizeByTransferDefIds(items, definitionIds, { onlyMatching = false } = {}) {
    const order = new Map();
    for (let i = 0; i < (definitionIds || []).length; i++) {
      const id = Number(definitionIds[i]);
      if (Number.isFinite(id) && !order.has(id)) order.set(id, i);
    }
    if (!order.size) {
      return onlyMatching ? [] : [...(items || [])];
    }

    const preferredById = new Map();
    const rest = [];
    for (const item of items || []) {
      if (!item) continue;
      const id = Number(definitionIdOf(item));
      if (Number.isFinite(id) && order.has(id)) {
        if (!preferredById.has(id)) preferredById.set(id, item);
        continue;
      }
      if (!onlyMatching) rest.push(item);
    }

    const preferred = [];
    for (const id of order.keys()) {
      if (preferredById.has(id)) preferred.push(preferredById.get(id));
    }
    return onlyMatching ? preferred : preferred.concat(rest);
  }

  function itemResourceId(item) {
    if (!item) return null;
    const raw =
      item.id ??
      item.resourceId ??
      item._id ??
      (typeof item.getId === 'function' ? item.getId() : null);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function collectItemsFromPileCache(pileKey) {
    const repos = win.repositories?.Item;
    if (!repos) return [];
    const pile = repos[pileKey];
    if (!pile) return [];
    const candidates = [
      Array.isArray(pile.items) ? pile.items : null,
      Array.isArray(pile._items) ? pile._items : null,
      typeof pile.getItems === 'function' ? pile.getItems() : null,
      typeof pile.values === 'function' ? [...pile.values()] : null,
    ];
    for (const raw of candidates) {
      if (!raw) continue;
      const list = Array.isArray(raw) ? raw : Object.values(raw);
      if (list.length) return list.filter(Boolean);
    }
    return [];
  }

  /**
   * Paletools "Use Transfer List Players" ends with saveChallenge + resetting
   * Item unassigned/transfer cache stamps so TL reloads with fresh duplicateId.
   * "Send Non Duplicated To Club" only appears when duplicateId === 0.
   * Template builds assign club copies but skip that TL cache bust — mirror it.
   */
  function refreshTransferListAfterClubCopiesUsed(usedClubItems) {
    const repos = win.repositories?.Item;
    const ItemPile = win.ItemPile;
    const usedIds = new Set();
    for (const item of usedClubItems || []) {
      for (const id of clubItemIdentityIds(item)) usedIds.add(id);
    }

    let cleared = 0;
    if (usedIds.size) {
      const tlItems = [...collectItemsFromPileCache('transfer')];
      try {
        if (repos && ItemPile?.TRANSFER != null) {
          const extra = [
            typeof repos.getAllItems === 'function'
              ? repos.getAllItems(ItemPile.TRANSFER)
              : null,
            typeof repos.getItems === 'function'
              ? repos.getItems(ItemPile.TRANSFER)
              : null,
            typeof repos.getPileItems === 'function'
              ? repos.getPileItems(ItemPile.TRANSFER)
              : null,
          ];
          for (const raw of extra) {
            if (!raw) continue;
            const list = Array.isArray(raw)
              ? raw
              : typeof raw.values === 'function'
                ? [...raw.values()]
                : Object.values(raw);
            for (const item of list) tlItems.push(item);
          }
        }
      } catch {
        /* ignore */
      }

      const seen = new Set();
      for (const item of tlItems) {
        if (!item || seen.has(item)) continue;
        seen.add(item);
        const dup = duplicateIdOf(item);
        if (dup > 0 && usedIds.has(dup)) {
          item.duplicateId = 0;
          if (item._duplicateId != null) item._duplicateId = 0;
          if (item.duplicateItemId != null) item.duplicateItemId = 0;
          cleared++;
        }
      }
    }

    try {
      if (typeof repos?.setDirty === 'function' && ItemPile) {
        for (const pile of [
          ItemPile.TRANSFER,
          ItemPile.CLUB,
          ItemPile.PURCHASED,
        ]) {
          if (pile != null) repos.setDirty(pile);
        }
      }
    } catch (err) {
      log('Item.setDirty after TL club-copy SBC use failed', err);
    }

    // Paletools transferListToSbc zeroes a cache stamp on unassigned + transfer
    // (obfuscated property). Mirror via common stamp / loaded flags.
    for (const key of ['transfer', 'unassigned']) {
      try {
        const pile = repos?.[key];
        if (!pile || typeof pile !== 'object') continue;
        for (const prop of [
          'timestamp',
          'updated',
          'lastUpdated',
          'stale',
          'expiry',
          'ttl',
          '_timestamp',
          'generation',
          'revision',
        ]) {
          if (typeof pile[prop] === 'number') pile[prop] = 0;
        }
        if (typeof pile.isLoaded === 'boolean') pile.isLoaded = false;
        if (typeof pile.loaded === 'boolean') pile.loaded = false;
        // If the stamp is a lone numeric own-prop (EA/Paletools style), zero it
        const numericKeys = Object.keys(pile).filter(
          (p) => typeof pile[p] === 'number' && !Array.isArray(pile[p])
        );
        if (numericKeys.length === 1) pile[numericKeys[0]] = 0;
      } catch {
        /* ignore */
      }
    }

    log('Refreshed TL duplicate state after club copies used in SBC', {
      usedClubItems: usedIds.size,
      duplicateIdsCleared: cleared,
    });
  }

  function getControllerChallenge(controller) {
    return (
      controller?.challenge ||
      controller?._challenge ||
      controller?.squad?.challenge ||
      controller?._squad?.challenge ||
      null
    );
  }

  function getControllerSquad(controller) {
    const challenge = getControllerChallenge(controller);
    if (challenge) {
      if (challenge.squad) return challenge.squad;
      try {
        if (typeof challenge.getSquad === 'function') return challenge.getSquad();
      } catch {
        /* ignore */
      }
    }
    return controller?.squad || controller?._squad || null;
  }

  function collectSquadPlayerItems(controller) {
    const items = [];
    try {
      const squad = getControllerSquad(controller);
      if (!squad) return items;
      let slots = null;
      if (typeof squad.getSBCSlots === 'function') slots = squad.getSBCSlots();
      else if (typeof squad.getPlayers === 'function') slots = squad.getPlayers();
      else if (Array.isArray(squad.players)) slots = squad.players;
      if (!slots) return items;
      const list = Array.isArray(slots)
        ? slots
        : typeof slots.values === 'function'
          ? [...slots.values()]
          : Object.values(slots);
      for (const slot of list) {
        const item = slot?.item || slot?.player || slot;
        if (item && definitionIdOf(item) != null) {
          const id = itemResourceId(item);
          if (id != null && id === 0) continue;
          items.push(item);
        }
      }
    } catch (err) {
      log('collectSquadPlayerItems failed', err);
    }
    return items;
  }

  function countSbcSlotsToFill(controller) {
    try {
      const settings = getSearchSettings(controller);
      const configured = Number(settings?.playerCount ?? settings?.count);
      if (Number.isFinite(configured) && configured > 0) return configured;
    } catch {
      /* ignore */
    }
    try {
      const squad = getControllerSquad(controller);
      if (!squad || typeof squad.getSBCSlots !== 'function') return 0;
      const slots = squad.getSBCSlots();
      const list = Array.isArray(slots)
        ? slots
        : typeof slots.values === 'function'
          ? [...slots.values()]
          : Object.values(slots || {});
      let empty = 0;
      for (const slot of list) {
        const item = slot?.item;
        const id = item ? itemResourceId(item) : null;
        if (!item || id == null || id === 0) empty++;
      }
      return empty;
    } catch {
      return 0;
    }
  }

  /**
   * TL club-copies first, then the rest, capped to `limit`.
   * Critical for combo sources: the squad builder often re-picks by rating from
   * the whole candidate list — a long preferred+club list loses TL priority.
   */
  function mergeTransferFirstCapped(preferred, rest, limit) {
    const cap =
      Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 23;
    const out = [];
    const seenDef = new Set();
    const seenItem = new Set();

    function add(item) {
      if (!item || out.length >= cap) return;
      const rid = itemResourceId(item);
      if (rid != null) {
        if (seenItem.has(rid)) return;
        seenItem.add(rid);
      }
      const defId = definitionIdOf(item);
      if (defId != null) {
        if (seenDef.has(defId)) return;
        seenDef.add(defId);
      } else if (rid == null) {
        return;
      }
      out.push(item);
    }

    for (const item of preferred || []) add(item);
    for (const item of rest || []) add(item);
    return out;
  }

  /**
   * After the default builder fills (often by cheapest rating), rewrite the
   * squad so unlisted-TL club copies occupy slots first, then other club/storage
   * players already chosen — matching Transfer / Club source order.
   */
  function reprioritizeSquadTransferFirst(controller, preferredClubCopies) {
    const preferred = preferredClubCopies || [];
    if (!preferred.length) return false;

    const squad = getControllerSquad(controller);
    const challenge = getControllerChallenge(controller);
    if (!squad || typeof squad.getSBCSlots !== 'function') return false;
    if (typeof squad.setPlayers !== 'function') return false;

    let slots;
    try {
      slots = squad.getSBCSlots();
    } catch {
      return false;
    }
    const slotList = Array.isArray(slots)
      ? slots
      : typeof slots.values === 'function'
        ? [...slots.values()]
        : Object.values(slots || {});

    const slotIndices = [];
    const currentPlayers = [];
    for (const slot of slotList) {
      if (slot == null || slot.index == null) continue;
      slotIndices.push(Number(slot.index));
      const item = slot.item;
      const id = item ? itemResourceId(item) : null;
      if (item && id != null && id !== 0 && definitionIdOf(item) != null) {
        currentPlayers.push(item);
      }
    }
    if (!slotIndices.length) return false;

    const pool = mergeTransferFirstCapped(
      preferred,
      currentPlayers,
      slotIndices.length
    );
    if (!pool.length) return false;

    const byIndex = new Array(23);
    for (let i = 0; i < slotIndices.length && i < pool.length; i++) {
      byIndex[slotIndices[i]] = pool[i];
    }

    try {
      squad.setPlayers(byIndex, true);
      const sbc = win.services?.SBC;
      if (challenge && sbc) {
        if (typeof sbc.saveChallenge === 'function') {
          sbc.saveChallenge(challenge);
        } else if (typeof sbc.save === 'function') {
          sbc.save(challenge);
        }
      }
      log('Re-applied Transfer-then-Club order on SBC squad', {
        preferred: preferred.length,
        placed: pool.length,
        slots: slotIndices.length,
      });
      return true;
    } catch (err) {
      log('reprioritizeSquadTransferFirst failed', err);
      return false;
    }
  }

  /**
   * Players the user marked SBC on the Players tab. A duplicate may be used.
   * The only club copy stays out of the template candidate pool. Paletools'
   * own important list is not changed.
   */
  function isSbcProtectedClubPlayer(item, leagues, nations) {
    if (!item || isConceptItem(item)) return false;
    let player = isPlayer(item);
    if (!player) {
      try {
        player = !!(win.ItemType && item.type === win.ItemType.PLAYER);
      } catch {
        player = false;
      }
    }
    if (!player) return false;
    const leagueId = getLeagueId(item);
    const nationId = getNationId(item);
    return (
      (leagueId != null && leagues.has(leagueId)) ||
      (nationId != null && nations.has(nationId))
    );
  }

  function sbcSpareDefinitionIds(controller) {
    const ids = new Set();
    const add = (value) => {
      const n = Number(value);
      if (Number.isFinite(n)) ids.add(n);
    };
    if (state.sbcSpareDefIds) {
      for (const id of state.sbcSpareDefIds) add(id);
    }
    const local = controller?.__companionTransferDefIds;
    if (Array.isArray(local)) {
      for (const id of local) add(id);
    }
    return ids;
  }

  /**
   * Companion SBC leagues/nations extend Paletools' important lists, and only
   * while the template step has the matching "Not Important … Only" toggle on.
   */
  function sbcListsForTemplateSettings(settings) {
    return {
      leagues: settings?.unimportantLeaguesOnly
        ? getPlayerSbcLeagueIds()
        : new Set(),
      nations: settings?.unimportantNationsOnly
        ? getPlayerSbcNationIds()
        : new Set(),
    };
  }

  function sbcListsActive(lists) {
    return !!lists && (lists.leagues.size > 0 || lists.nations.size > 0);
  }

  function holdUniqueSbcPlayers(items, spareDefIds, lists, options) {
    const leagues = lists?.leagues instanceof Set ? lists.leagues : new Set();
    const nations = lists?.nations instanceof Set ? lists.nations : new Set();
    if (
      (!leagues.size && !nations.size) ||
      !Array.isArray(items) ||
      !items.length
    ) {
      return { items: items || [], held: 0, spared: 0 };
    }
    const spare = spareDefIds instanceof Set ? spareDefIds : null;
    const groups = new Map();
    let spared = 0;
    for (const item of items) {
      if (!isSbcProtectedClubPlayer(item, leagues, nations)) continue;
      if (options?.skipStorage && isSbcStorageItem(item)) {
        spared++;
        continue;
      }
      const def = definitionIdOf(item);
      if (def != null && spare && spare.has(def)) {
        spared++;
        continue;
      }
      const key = def == null ? item : def;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const exclude = new Set();
    for (const group of groups.values()) {
      const dupes = group.filter((item) => duplicateIdOf(item) > 0);
      const uniques = group.filter((item) => !(duplicateIdOf(item) > 0));
      if (dupes.length) {
        for (const item of uniques) exclude.add(item);
      } else if (uniques.length) {
        exclude.add(uniques[0]);
      }
    }
    if (!exclude.size) return { items, held: 0, spared };
    return {
      items: items.filter((item) => !exclude.has(item)),
      held: exclude.size,
      spared,
    };
  }

  function applySbcUniqueProtection(response, settings) {
    const lists = sbcListsForTemplateSettings(settings);
    if (!sbcListsActive(lists)) return response;
    const items = response?.response?.items || response?.items;
    if (!Array.isArray(items) || !items.length) return response;
    const ignore = readTemplateIgnoreFlags(settings);
    const result = holdUniqueSbcPlayers(items, null, lists, {
      skipStorage: ignore.storage,
    });
    if (!result.held) return response;
    if (response?.response) response.response.items = result.items;
    else response.items = result.items;
    log('Held unique club copies out of SBC template candidates', {
      held: result.held,
      pool: items.length,
      eligible: result.items.length,
    });
    return response;
  }

  function applyTransferPriorityToSearchResponse(controller, response) {
    const defIds = controller.__companionTransferDefIds;
    const preferred = controller.__companionTransferClubCopies || [];
    const onlyMatching = !!controller.__companionTransferOnlyMatching;

    controller.__companionTransferDefIds = null;
    controller.__companionTransferClubCopies = null;
    controller.__companionTransferOnlyMatching = false;

    if (!defIds?.length && !preferred.length) {
      return response;
    }

    // Remember for post-build TL duplicate refresh + combo squad reorder
    controller.__companionTransferNeedsTlRefresh = true;
    const ignoreTransfer = readTemplateIgnoreFlags(
      getSearchSettings(controller),
      controller.__companionTransferRestoreSource
    ).transfer;
    let preferredForSquad = preferred.slice();
    if (
      !ignoreTransfer &&
      preferredForSquad.length &&
      typeof controller.filterAndSortPlayers === 'function'
    ) {
      try {
        const filtered = controller.filterAndSortPlayers(preferredForSquad);
        if (Array.isArray(filtered)) preferredForSquad = filtered;
      } catch (err) {
        log('Transfer-list importance filter failed', err);
      }
    }
    controller.__companionTransferPreferredClubCopies = preferredForSquad.slice();
    controller.__companionTransferDoSquadReprioritize =
      !onlyMatching && preferredForSquad.length > 0;

    const existing = response?.response?.items || response?.items || [];
    const slotLimit =
      existing.length ||
      countSbcSlotsToFill(controller) ||
      23;

    let merged;
    if (onlyMatching) {
      // Transfer-only: use resolved club copies (template-filtered). Fall back to
      // defId filter on the base search if resolve returned nothing.
      if (preferredForSquad.length) {
        merged = preferredForSquad.slice();
      } else {
        merged = prioritizeByTransferDefIds(existing, defIds || [], {
          onlyMatching: true,
        });
      }
    } else {
      // Combo: TL club-copies first, then club/storage — capped to slot count so
      // a rating-based picker cannot skip TL cards in favour of cheaper club ones.
      const rest = prioritizeByTransferDefIds(existing, defIds || [], {
        onlyMatching: false,
      });
      merged = mergeTransferFirstCapped(preferredForSquad, rest, slotLimit);
    }

    if (response?.response) response.response.items = merged;
    else if (response) response.items = merged;
    else response = { success: true, response: { items: merged } };

    log('Applied unlisted-TL priority to SBC template search results', {
      transferDefIds: (defIds || []).length,
      preferredCopies: preferred.length,
      eligiblePreferred: preferredForSquad.length,
      ignoreImportanceTransfer: ignoreTransfer,
      matchedLeading: merged.filter((item) =>
        (defIds || []).includes(Number(definitionIdOf(item)))
      ).length,
      total: merged.length,
      slotLimit,
      onlyMatching,
    });
    return response;
  }

  function isTransferSearchSource(value) {
    const n = Number(value);
    return (
      n === SBC_SEARCH_SOURCE.TRANSFER_STORAGE_CLUB ||
      n === SBC_SEARCH_SOURCE.TRANSFER_STORAGE ||
      n === SBC_SEARCH_SOURCE.TRANSFER_CLUB ||
      n === SBC_SEARCH_SOURCE.TRANSFER_CLUB_STORAGE ||
      n === SBC_SEARCH_SOURCE.TRANSFER
    );
  }

  function findSquadBuilderSearchMethod(proto) {
    const keys = Object.getOwnPropertyNames(proto);
    // Prefer the Paletools-patched searchSource switch
    for (const key of keys) {
      const fn = proto[key];
      if (typeof fn !== 'function' || fn.__companionTransferSearch) continue;
      let src = '';
      try {
        src = Function.prototype.toString.call(fn);
      } catch {
        continue;
      }
      if (
        src.includes('searchSource') &&
        (src.includes('onClubSearchComplete') ||
          src.includes('ItemSearchFeature') ||
          src.includes('searchSettings'))
      ) {
        return key;
      }
    }
    // Fallback: any method that completes club search
    for (const key of keys) {
      const fn = proto[key];
      if (typeof fn !== 'function' || fn.__companionTransferSearch) continue;
      let src = '';
      try {
        src = Function.prototype.toString.call(fn);
      } catch {
        continue;
      }
      if (src.includes('onClubSearchComplete') && src.includes('searchCriteria')) {
        return key;
      }
    }
    return null;
  }

  function isSbcStorageItem(item) {
    if (!item) return false;
    try {
      if (typeof item.isStorageItem === 'function' && item.isStorageItem()) return true;
    } catch {
      /* ignore */
    }
    const pile = item.pile ?? item._pile;
    const storage = win.ItemPile?.STORAGE;
    return storage != null && pile === storage;
  }

  const templateIgnoreModels = [];

  /**
   * Paletools copies search settings field-by-field and drops unknown fields
   * when it rebuilds a step. Empty ratings also fall through to the criteria,
   * so the fingerprint has to match that rebuilt object. Sort is omitted
   * because the copy does not preserve it.
   */
  function normalizeIgnoreScalar(value) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value === 0) return '';
      return String(value);
    }
    if (value == null) return '';
    const text = String(value).trim();
    if (!text || text === 'NaN') return '';
    const numeric = Number(text);
    if (Number.isFinite(numeric) && numeric === 0) return '';
    return text;
  }

  function normalizeIgnoreSource(value) {
    if (value == null || value === '') return '';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(numeric) : '';
  }

  function templateIgnoreKey(model, sourceOverride) {
    if (!model || typeof model !== 'object') return '';
    const source = sourceOverride != null ? sourceOverride : model.searchSource;
    return [
      normalizeIgnoreScalar(model.minRating),
      normalizeIgnoreScalar(model.maxRating),
      normalizeIgnoreScalar(model.maxPlayers),
      normalizeIgnoreScalar(model.playersFromSameClub),
      model.ignorePlayerPos ? 1 : 0,
      model.importantLeaguesOnly ? 1 : 0,
      model.unimportantLeaguesOnly ? 1 : 0,
      model.importantNationsOnly ? 1 : 0,
      model.unimportantNationsOnly ? 1 : 0,
      'ss',
      normalizeIgnoreSource(source),
    ].join(':');
  }

  function legacyTemplateIgnoreKey(model, sourceOverride) {
    if (!model || typeof model !== 'object') return '';
    const source = sourceOverride != null ? sourceOverride : model.searchSource;
    return [
      model.minRating ?? '',
      model.maxRating ?? '',
      model.maxPlayers ?? '',
      model.playersFromSameClub ?? '',
      model.ignorePlayerPos ? 1 : 0,
      model.importantLeaguesOnly ? 1 : 0,
      model.unimportantLeaguesOnly ? 1 : 0,
      model.importantNationsOnly ? 1 : 0,
      model.unimportantNationsOnly ? 1 : 0,
      'ss',
      source ?? '',
    ].join(':');
  }

  /**
   * Mirrors Paletools' settings constructor: a missing rating is replaced by
   * the criteria bound, and the other fields are copied with &&.
   */
  function predictLoadedSettings(settings, criteria) {
    const minFallback = criteria && (criteria.ovrMin != null ? criteria.ovrMin : criteria.minRating);
    const maxFallback = criteria && (criteria.ovrMax != null ? criteria.ovrMax : criteria.maxRating);
    return {
      minRating: (settings && settings.minRating) || minFallback,
      maxRating: (settings && settings.maxRating) || maxFallback,
      maxPlayers: settings && settings.maxPlayers,
      playersFromSameClub: settings && settings.playersFromSameClub,
      ignorePlayerPos: settings && settings.ignorePlayerPos,
      importantLeaguesOnly: settings && settings.importantLeaguesOnly,
      unimportantLeaguesOnly: settings && settings.unimportantLeaguesOnly,
      importantNationsOnly: settings && settings.importantNationsOnly,
      unimportantNationsOnly: settings && settings.unimportantNationsOnly,
      searchSource: settings && settings.searchSource,
    };
  }

  function ignoreKeysForModel(model, sourceOverride, criteria) {
    if (!model || typeof model !== 'object') return [];
    const predicted = predictLoadedSettings(model, criteria);
    const keys = [
      templateIgnoreKey(model, sourceOverride),
      templateIgnoreKey(predicted, sourceOverride),
      legacyTemplateIgnoreKey(model, sourceOverride),
      legacyTemplateIgnoreKey(predicted, sourceOverride),
    ];
    if (sourceOverride != null) {
      keys.push(templateIgnoreKey(model), templateIgnoreKey(predicted));
      keys.push(legacyTemplateIgnoreKey(model), legacyTemplateIgnoreKey(predicted));
    }
    return [...new Set(keys.filter(Boolean))];
  }

  function legacyIgnoreComparable(serialized) {
    return String(serialized || '')
      .replace(/;ss:[^;]*/g, '')
      .replace(/;sb:[^;]*/g, '')
      .replace(/;it:\d+/g, '')
      .replace(/;is:\d+/g, '');
  }

  function lookupStoredIgnore(settings, sourceOverride) {
    const map = readJson(STORAGE_TEMPLATE_IGNORE, {});
    for (const key of ignoreKeysForModel(settings, sourceOverride)) {
      if (map[key]) return map[key];
    }
    let serialized = '';
    try {
      if (typeof settings.serialize === 'function') {
        serialized = String(settings.serialize() || '');
      }
    } catch {
      serialized = '';
    }
    if (serialized && map[serialized]) return map[serialized];
    const source = sourceOverride != null ? sourceOverride : settings.searchSource;
    if (serialized && source != null && source !== '') {
      const swapped = serialized.replace(/;ss:[^;]*/, ';ss:' + source);
      if (map[swapped]) return map[swapped];
    }
    const want = legacyIgnoreComparable(serialized);
    if (!want) return null;
    let fallback = null;
    for (const [storedKey, value] of Object.entries(map)) {
      if (!value || typeof value !== 'object') continue;
      if (legacyIgnoreComparable(storedKey) !== want) continue;
      if (source != null && String(storedKey).includes(';ss:' + source)) return value;
      fallback = value;
    }
    return fallback;
  }

  function ignoreFlagsKnown(settings) {
    return (
      !!settings &&
      (Object.prototype.hasOwnProperty.call(settings, 'ignoreImportanceTransfer') ||
        Object.prototype.hasOwnProperty.call(settings, 'ignoreImportanceStorage'))
    );
  }

  function ignoreFlagsOf(settings) {
    return {
      transfer: !!settings?.ignoreImportanceTransfer,
      storage: !!settings?.ignoreImportanceStorage,
    };
  }

  function flagsFromTrackedModels(settings, sourceOverride) {
    if (!settings) return null;
    for (let i = templateIgnoreModels.length - 1; i >= 0; i--) {
      const model = templateIgnoreModels[i];
      if (model === settings && ignoreFlagsKnown(model)) return ignoreFlagsOf(model);
    }
    const keys = new Set(ignoreKeysForModel(settings, sourceOverride));
    if (!keys.size) return null;
    for (let i = templateIgnoreModels.length - 1; i >= 0; i--) {
      const model = templateIgnoreModels[i];
      if (!model || !ignoreFlagsKnown(model)) continue;
      const modelKeys = ignoreKeysForModel(model);
      if (modelKeys.some((key) => keys.has(key))) return ignoreFlagsOf(model);
    }
    return null;
  }

  function installSettingsFlagCopy(settings) {
    const proto = settings ? Object.getPrototypeOf(settings) : null;
    if (!proto || proto === Object.prototype || proto.__companionIgnoreCopy) return;
    installSettingsPersistence(settings);
    const existing = Object.getOwnPropertyDescriptor(proto, 'searchSource');
    if (existing) {
      proto.__companionIgnoreCopy = true;
      return;
    }
    Object.defineProperty(proto, 'searchSource', {
      configurable: true,
      enumerable: true,
      set(value) {
        const previous = Object.prototype.hasOwnProperty.call(this, 'searchSource')
          ? this.searchSource
          : undefined;
        Object.defineProperty(this, 'searchSource', {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        const flags =
          flagsFromTrackedModels(this, value) ||
          (previous != null && previous !== value
            ? flagsFromTrackedModels(this, previous)
            : null) ||
          lookupStoredIgnore(this, value) ||
          (previous != null && previous !== value
            ? lookupStoredIgnore(this, previous)
            : null);
        if (!flags) return;
        this.ignoreImportanceTransfer = !!flags.transfer;
        this.ignoreImportanceStorage = !!flags.storage;
      },
      get() {
        return undefined;
      },
    });
    proto.__companionIgnoreCopy = true;
    installSettingsPersistence(settings);
  }

  function installSettingsPersistence(settings) {
    const proto = settings ? Object.getPrototypeOf(settings) : null;
    if (!proto || proto === Object.prototype || proto.__companionIgnorePersist) return;
    proto.__companionIgnorePersist = true;
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      const fn = desc?.value;
      if (typeof fn !== 'function' || fn.__companionIgnoreWrapped) continue;
      let src = '';
      try {
        src = Function.prototype.toString.call(fn);
      } catch {
        continue;
      }
      if (src.includes(';ss:') && src.includes('return')) {
        proto[key] = function companionSerializeIgnore() {
          const base = String(fn.call(this) || '')
            .replace(/;it:\d+/g, '')
            .replace(/;is:\d+/g, '');
          return (
            base +
            ';it:' +
            (this.ignoreImportanceTransfer ? 1 : 0) +
            ';is:' +
            (this.ignoreImportanceStorage ? 1 : 0)
          );
        };
        proto[key].__companionIgnoreWrapped = true;
        continue;
      }
      if (src.includes("case'ss'") || src.includes('case"ss"')) {
        proto[key] = function companionDeserializeIgnore(serialized) {
          const result = fn.apply(this, arguments);
          const text = String(serialized || '');
          const transfer = /(?:^|;)it:(\d+)/.exec(text);
          const storage = /(?:^|;)is:(\d+)/.exec(text);
          if (transfer) this.ignoreImportanceTransfer = transfer[1] === '1';
          if (storage) this.ignoreImportanceStorage = storage[1] === '1';
          return result;
        };
        proto[key].__companionIgnoreWrapped = true;
        continue;
      }
      if (
        src.includes('importantLeaguesOnly') &&
        src.includes('ignorePlayerPos') &&
        !src.includes('toggleById') &&
        !src.includes(';ss:')
      ) {
        proto[key] = function companionCopyIgnore(other) {
          const result = fn.apply(this, arguments);
          if (other && typeof other === 'object') {
            const flags = ignoreFlagsKnown(other)
              ? ignoreFlagsOf(other)
              : lookupStoredIgnore(other);
            if (flags) {
              this.ignoreImportanceTransfer = !!flags.transfer;
              this.ignoreImportanceStorage = !!flags.storage;
            }
          }
          return result;
        };
        proto[key].__companionIgnoreWrapped = true;
      }
    }
  }

  function trackTemplateIgnoreModel(model) {
    if (!model || typeof model !== 'object') return;
    installSettingsFlagCopy(model);
    installSettingsPersistence(model);
    const idx = templateIgnoreModels.indexOf(model);
    if (idx >= 0) templateIgnoreModels.splice(idx, 1);
    templateIgnoreModels.push(model);
    if (templateIgnoreModels.length > 40) templateIgnoreModels.shift();
  }

  function rememberTemplateIgnore(model, criteria) {
    if (!model || typeof model !== 'object') return;
    const map = readJson(STORAGE_TEMPLATE_IGNORE, {});
    const flags = ignoreFlagsOf(model);
    let changed = false;
    for (const key of ignoreKeysForModel(model, null, criteria)) {
      const current = map[key];
      if (current && !!current.transfer === flags.transfer && !!current.storage === flags.storage) {
        continue;
      }
      map[key] = flags;
      changed = true;
    }
    if (changed) writeJson(STORAGE_TEMPLATE_IGNORE, map);
  }

  function readTemplateIgnoreFlags(settings, sourceOverride) {
    const blank = { transfer: false, storage: false };
    if (!settings || typeof settings !== 'object') return blank;
    const saved =
      flagsFromTrackedModels(settings, sourceOverride) ||
      lookupStoredIgnore(settings, sourceOverride);
    if (saved) {
      const transfer = !!saved.transfer;
      const storage = !!saved.storage;
      const hadTransfer = Object.prototype.hasOwnProperty.call(
        settings,
        'ignoreImportanceTransfer'
      );
      const hadStorage = Object.prototype.hasOwnProperty.call(
        settings,
        'ignoreImportanceStorage'
      );
      const changed =
        !hadTransfer ||
        !hadStorage ||
        !!settings.ignoreImportanceTransfer !== transfer ||
        !!settings.ignoreImportanceStorage !== storage;
      settings.ignoreImportanceTransfer = transfer;
      settings.ignoreImportanceStorage = storage;
      if (changed && (transfer || storage)) {
        log('Template ignore-importance applied', {
          transfer,
          storage,
          searchSource:
            sourceOverride != null ? sourceOverride : settings.searchSource,
        });
      }
      return { transfer, storage };
    }
    return {
      transfer: !!settings.ignoreImportanceTransfer,
      storage: !!settings.ignoreImportanceStorage,
    };
  }

  function snapshotImportanceToggles(settings) {
    return {
      importantLeaguesOnly: !!settings?.importantLeaguesOnly,
      unimportantLeaguesOnly: !!settings?.unimportantLeaguesOnly,
      importantNationsOnly: !!settings?.importantNationsOnly,
      unimportantNationsOnly: !!settings?.unimportantNationsOnly,
    };
  }

  function writeImportanceToggles(settings, values) {
    if (!settings) return;
    settings.importantLeaguesOnly = !!values.importantLeaguesOnly;
    settings.unimportantLeaguesOnly = !!values.unimportantLeaguesOnly;
    settings.importantNationsOnly = !!values.importantNationsOnly;
    settings.unimportantNationsOnly = !!values.unimportantNationsOnly;
  }

  function clearImportanceToggles(settings) {
    writeImportanceToggles(settings, {});
  }

  /**
   * Paletools sorts the club pool in filterAndSortPlayers, then slices to the
   * number of open slots. Unique copies have to come out before that slice,
   * or the squad is left short with no replacements.
   */
  function installSbcUniquePlayerFilter() {
    const proto = win.UTSquadBuilderViewController?.prototype;
    const current = proto?.filterAndSortPlayers;
    if (typeof current !== 'function') return false;
    if (current.__companionSbcUniqueFilter) return true;

    function companionFilterAndSortPlayers(...args) {
      const settings = this.viewModel?.searchSettings;
      const ignore = readTemplateIgnoreFlags(
        settings,
        this.__companionTransferRestoreSource
      );
      const lists = sbcListsForTemplateSettings(settings);
      const protecting = sbcListsActive(lists);
      const savedMax = settings ? settings.maxPlayers : undefined;
      const clearMax = protecting && settings && savedMax;
      if (clearMax) settings.maxPlayers = 0;
      const players = Array.isArray(args[0]) ? args[0] : null;
      let sorted;
      try {
        if (ignore.storage && players?.some(isSbcStorageItem)) {
          const storage = players.filter(isSbcStorageItem);
          const club = players.filter((item) => !isSbcStorageItem(item));
          const clubFiltered = club.length ? current.call(this, club) : [];
          const savedToggles = snapshotImportanceToggles(settings);
          clearImportanceToggles(settings);
          try {
            sorted = current.call(
              this,
              []
                .concat(Array.isArray(clubFiltered) ? clubFiltered : [])
                .concat(storage)
            );
          } finally {
            writeImportanceToggles(settings, savedToggles);
          }
        } else {
          sorted = current.apply(this, args);
        }
      } finally {
        if (clearMax) settings.maxPlayers = savedMax;
      }
      if (!protecting) return sorted;
      this.__companionSbcPoolFiltered = true;
      state.sbcPoolFiltered = true;
      if (!Array.isArray(sorted)) return sorted;
      const spare = ignore.transfer ? sbcSpareDefinitionIds(this) : new Set();
      const result = holdUniqueSbcPlayers(sorted, spare, lists, {
        skipStorage: ignore.storage,
      });
      if (result.held || result.spared) {
        log('Held unique club copies before SBC squad selection', {
          pool: sorted.length,
          held: result.held,
          eligible: result.items.length,
          sparedTransferDuplicates: result.spared,
          notImportantLeaguesOnly: !!settings?.unimportantLeaguesOnly,
          notImportantNationsOnly: !!settings?.unimportantNationsOnly,
          ignoreImportanceTransfer: ignore.transfer,
          ignoreImportanceStorage: ignore.storage,
        });
      }
      return result.items;
    }
    companionFilterAndSortPlayers.__companionSbcUniqueFilter = true;
    proto.filterAndSortPlayers = companionFilterAndSortPlayers;
    log('SBC template unique-copy filter installed');
    return true;
  }

  function installSquadBuilderTransferSearchHook() {
    const proto = win.UTSquadBuilderViewController?.prototype;
    if (!proto) return false;

    const methodName = findSquadBuilderSearchMethod(proto);
    if (!methodName) {
      return false;
    }

    function ensureOnClubSearchCompleteMerge() {
      const current = proto.onClubSearchComplete;
      if (typeof current !== 'function') return;

      // Already our wrapper
      if (current.__companionTransferMerge) return;

      const originalComplete = current;
      function companionOnClubSearchComplete(observer, response) {
        let needsTlRefresh = false;
        let doSquadReprioritize = false;
        let preferredClubCopies = [];
        try {
          response = applyTransferPriorityToSearchResponse(this, response);
          needsTlRefresh = !!this.__companionTransferNeedsTlRefresh;
          doSquadReprioritize = !!this.__companionTransferDoSquadReprioritize;
          preferredClubCopies =
            this.__companionTransferPreferredClubCopies || [];
          if (this.__companionTransferRestoreSource != null) {
            const settings = getSearchSettings(this);
            if (settings) {
              settings.searchSource = this.__companionTransferRestoreSource;
            }
            this.__companionTransferRestoreSource = null;
          }
        } catch (err) {
          warn('transfer priority merge failed', err);
        }
        try {
          // The pool filter already ran, or these results were capped to the
          // open slots and then topped up with transfer-list duplicates.
          // Filtering again deletes chosen players and does not replace them.
          const poolAlreadyFiltered =
            state.sbcPoolFiltered || !!this.__companionSbcPoolFiltered;
          if (!poolAlreadyFiltered && !needsTlRefresh) {
            response = applySbcUniqueProtection(
              response,
              this.viewModel?.searchSettings
            );
          }
          this.__companionSbcPoolFiltered = false;
          state.sbcPoolFiltered = false;
          state.sbcSpareDefIds = null;
        } catch (err) {
          log('SBC unique-copy filter failed', err);
        }
        const result = originalComplete.call(this, observer, response);
        if (doSquadReprioritize && preferredClubCopies.length) {
          try {
            reprioritizeSquadTransferFirst(this, preferredClubCopies);
          } catch (err) {
            log('Transfer-then-Club squad reorder failed', err);
          } finally {
            this.__companionTransferDoSquadReprioritize = false;
          }
        }
        if (needsTlRefresh) {
          try {
            // Prefer items actually sitting in the SBC squad; fall back to the
            // club copies we injected for this transfer-sourced build.
            const inSquad = collectSquadPlayerItems(this);
            refreshTransferListAfterClubCopiesUsed(
              inSquad.length ? inSquad : preferredClubCopies
            );
          } catch (err) {
            log('TL duplicate refresh after template build failed', err);
          } finally {
            this.__companionTransferNeedsTlRefresh = false;
            this.__companionTransferPreferredClubCopies = null;
          }
        }
        return result;
      }
      companionOnClubSearchComplete.__companionTransferMerge = true;

      // Point every prototype alias that still references the old completer
      // at our wrapper (Paletools may call an obfuscated property name).
      for (const key of Object.getOwnPropertyNames(proto)) {
        try {
          if (proto[key] === originalComplete) {
            proto[key] = companionOnClubSearchComplete;
          }
        } catch {
          /* ignore */
        }
      }
      proto.onClubSearchComplete = companionOnClubSearchComplete;
    }

    ensureOnClubSearchCompleteMerge();
    if (proto[methodName].__companionTransferSearch) return true;

    const original = proto[methodName];

    function companionSquadSearch(...args) {
      const settings = getSearchSettings(this);
      try {
        installSettingsFlagCopy(settings);
        readTemplateIgnoreFlags(settings);
      } catch (err) {
        log('Template ignore-importance hydrate failed', err);
      }
      const source = Number(settings?.searchSource);
      if (!settings || !isTransferSearchSource(source)) {
        return original.apply(this, args);
      }

      const baseSource = TRANSFER_SOURCE_BASE[source];
      const onlyMatching = source === SBC_SEARCH_SOURCE.TRANSFER;
      const criteria = getSearchCriteria(this);

      // Always finish through Paletools' Storage/Club search → onClubSearchComplete
      // path so the template builder can dismiss the squad-builder child VC.
      // Injecting results via onClubSearchComplete alone leaves that UI open.
      fetchUnlistedTransferPlayers()
        .then(async (tlPlayers) => {
          const defIds = definitionIdsFromPlayers(tlPlayers);
          let clubCopies = [];
          try {
            clubCopies = await resolveClubCopiesForTransferPlayers(
              tlPlayers,
              criteria
            );
          } catch (err) {
            log('Club-copy resolve failed', err);
          }

          this.__companionTransferDefIds = defIds;
          this.__companionTransferClubCopies = clubCopies;
          state.sbcSpareDefIds = new Set(defIds);
          this.__companionTransferOnlyMatching = onlyMatching;
          this.__companionTransferRestoreSource = source;
          settings.searchSource = baseSource;

          log('SBC template transfer-source prep', {
            source,
            baseSource,
            tlPlayers: tlPlayers.length,
            transferDefIds: defIds.length,
            clubCopies: clubCopies.length,
            onlyMatching,
          });

          try {
            original.apply(this, args);
          } catch (err) {
            settings.searchSource = source;
            this.__companionTransferDefIds = null;
            this.__companionTransferClubCopies = null;
            this.__companionTransferOnlyMatching = false;
            this.__companionTransferRestoreSource = null;
            log('Base Storage/Club search failed after transfer prep', err);
          }
        })
        .catch((err) => {
          log('Transfer-source prep failed; falling back to base source', err);
          this.__companionTransferRestoreSource = source;
          settings.searchSource = baseSource;
          try {
            original.apply(this, args);
          } catch (inner) {
            settings.searchSource = source;
            this.__companionTransferRestoreSource = null;
            log('Base source fallback failed', inner);
          }
        });
    }
    companionSquadSearch.__companionTransferSearch = true;
    proto[methodName] = companionSquadSearch;
    log('UTSquadBuilderViewController transfer search hook installed', {
      method: methodName,
    });
    return true;
  }

  let editorIgnoreQueue = null;
  let editorIgnoreCursor = 0;
  let editorIgnoreQueueAt = 0;

  function captureStepFlags(step, index, record) {
    const stored = record?.companionIgnore?.[index];
    if (stored && typeof stored === 'object') {
      return {
        transfer: !!stored.transfer,
        storage: !!stored.storage,
      };
    }
    const settings = step?.searchSettings;
    if (ignoreFlagsKnown(settings)) return ignoreFlagsOf(settings);
    if (!settings || typeof settings !== 'object') return null;
    for (let i = templateIgnoreModels.length - 1; i >= 0; i--) {
      const model = templateIgnoreModels[i];
      if (model === settings && ignoreFlagsKnown(model)) return ignoreFlagsOf(model);
    }
    return (
      lookupStoredIgnore(settings) ||
      lookupStoredIgnore(predictLoadedSettings(settings, step?.searchCriteria)) ||
      null
    );
  }

  function captureStepFlagsForSave(step) {
    const settings = step?.searchSettings;
    if (ignoreFlagsKnown(settings)) return ignoreFlagsOf(settings);
    for (let i = templateIgnoreModels.length - 1; i >= 0; i--) {
      const model = templateIgnoreModels[i];
      if (model === settings && ignoreFlagsKnown(model)) return ignoreFlagsOf(model);
    }
    return null;
  }

  function storeStepIgnoreFlags(step, flags) {
    if (!flags) return;
    const settings = step?.searchSettings;
    if (!settings || typeof settings !== 'object') return;
    settings.ignoreImportanceTransfer = !!flags.transfer;
    settings.ignoreImportanceStorage = !!flags.storage;
    const map = readJson(STORAGE_TEMPLATE_IGNORE, {});
    let changed = false;
    for (const key of ignoreKeysForModel(settings, null, step?.searchCriteria)) {
      const current = map[key];
      if (
        current &&
        !!current.transfer === !!flags.transfer &&
        !!current.storage === !!flags.storage
      ) {
        continue;
      }
      map[key] = {
        transfer: !!flags.transfer,
        storage: !!flags.storage,
      };
      changed = true;
    }
    if (changed) writeJson(STORAGE_TEMPLATE_IGNORE, map);
  }

  function queueEditorIgnoreFlags(flagsByStep) {
    editorIgnoreQueue = flagsByStep;
    editorIgnoreCursor = 0;
    editorIgnoreQueueAt = Date.now();
  }

  function nextEditorIgnoreFlags() {
    if (!editorIgnoreQueue || Date.now() - editorIgnoreQueueAt > 2000) {
      editorIgnoreQueue = null;
      return undefined;
    }
    if (editorIgnoreCursor >= editorIgnoreQueue.length) {
      editorIgnoreQueue = null;
      return undefined;
    }
    const entry = editorIgnoreQueue[editorIgnoreCursor];
    editorIgnoreCursor += 1;
    if (editorIgnoreCursor >= editorIgnoreQueue.length) editorIgnoreQueue = null;
    return entry;
  }

  function registerTemplateIgnoreRecord(record, queueEditor) {
    if (!record || typeof record !== 'object' || !Array.isArray(record.steps)) return;
    const flagsByStep = record.steps.map((step, index) => captureStepFlags(step, index, record));
    if (queueEditor) queueEditorIgnoreFlags(flagsByStep);
    flagsByStep.forEach((flags, index) => storeStepIgnoreFlags(record.steps[index], flags));
  }

  function indexTemplateIgnoreRecord(record) {
    if (!record || typeof record !== 'object' || !Array.isArray(record.steps)) return;
    const flagsByStep = record.steps.map((step) => captureStepFlagsForSave(step));
    if (flagsByStep.some(Boolean)) {
      record.companionIgnore = flagsByStep.map((flags) =>
        flags
          ? { transfer: !!flags.transfer, storage: !!flags.storage }
          : null
      );
    }
    flagsByStep.forEach((flags, index) => storeStepIgnoreFlags(record.steps[index], flags));
  }

  function isTemplateIgnoreStore(store) {
    const name = store?.name;
    return name === 'sbcTemplates' || name === 'globalSbcTemplates';
  }

  function watchTemplateIgnoreRequest(request, allRows) {
    if (!request || request.__companionIgnoreWatch || typeof request.addEventListener !== 'function') {
      return;
    }
    request.__companionIgnoreWatch = true;
    request.addEventListener('success', (event) => {
      try {
        const result = event?.target?.result ?? request.result;
        if (allRows || Array.isArray(result)) {
          if (Array.isArray(result)) {
            for (const row of result) registerTemplateIgnoreRecord(row, false);
          }
          return;
        }
        registerTemplateIgnoreRecord(result, true);
      } catch (err) {
        log('Template ignore-importance load failed', err);
      }
    });
  }

  function installTemplateIgnoreIdbHook() {
    const Store = win.IDBObjectStore;
    if (!Store?.prototype) return false;
    if (!Store.prototype.put?.__companionIgnore) {
      const originalPut = Store.prototype.put;
      Store.prototype.put = function (value, key) {
        try {
          if (isTemplateIgnoreStore(this)) indexTemplateIgnoreRecord(value);
        } catch (err) {
          log('Template ignore-importance save failed', err);
        }
        return originalPut.call(this, value, key);
      };
      Store.prototype.put.__companionIgnore = true;
    }
    if (!Store.prototype.get?.__companionIgnore) {
      const originalGet = Store.prototype.get;
      Store.prototype.get = function () {
        const request = originalGet.apply(this, arguments);
        if (isTemplateIgnoreStore(this)) watchTemplateIgnoreRequest(request, false);
        return request;
      };
      Store.prototype.get.__companionIgnore = true;
    }
    if (typeof Store.prototype.getAll === 'function' && !Store.prototype.getAll.__companionIgnore) {
      const originalGetAll = Store.prototype.getAll;
      Store.prototype.getAll = function () {
        const request = originalGetAll.apply(this, arguments);
        if (isTemplateIgnoreStore(this)) watchTemplateIgnoreRequest(request, true);
        return request;
      };
      Store.prototype.getAll.__companionIgnore = true;
    }
    return true;
  }

  function syncTemplateIgnoreToggles(control, model) {
    const group = control?._searchToggles;
    if (!group || typeof group.toggleById !== 'function' || !model) return;
    trackTemplateIgnoreModel(model);
    const queued = nextEditorIgnoreFlags();
    let flags;
    if (queued) {
      model.ignoreImportanceTransfer = !!queued.transfer;
      model.ignoreImportanceStorage = !!queued.storage;
      rememberTemplateIgnore(model);
      flags = queued;
    } else {
      flags = readTemplateIgnoreFlags(model);
    }
    group.toggleById('ignore-importance-transfer', !!flags.transfer);
    group.toggleById('ignore-importance-storage', !!flags.storage);
  }

  function hookTemplateEditorUpdate(control) {
    const proto = control ? Object.getPrototypeOf(control) : null;
    if (!proto || proto.__companionIgnoreUpdate) return;
    for (const key of Object.getOwnPropertyNames(proto)) {
      const fn = proto[key];
      if (typeof fn !== 'function' || fn.__companionIgnoreUpdate) continue;
      let src = '';
      try {
        src = Function.prototype.toString.call(fn);
      } catch {
        continue;
      }
      if (!src.includes('unimportant-nations-only') || !src.includes('toggleById')) {
        continue;
      }
      proto[key] = function (model) {
        const result = fn.apply(this, arguments);
        try {
          syncTemplateIgnoreToggles(this, model || this._model);
        } catch (err) {
          log('Template ignore-importance sync failed', err);
        }
        return result;
      };
      proto[key].__companionIgnoreUpdate = true;
      proto.__companionIgnoreUpdate = true;
      break;
    }
  }

  function applyTemplateIgnoreToggle(control, cell) {
    const id = cell?.id;
    if (id !== 'ignore-importance-transfer' && id !== 'ignore-importance-storage') {
      return;
    }
    const model = control?._model;
    if (!model) return;
    if (id === 'ignore-importance-transfer') {
      model.ignoreImportanceTransfer = !!cell.checked;
    } else {
      model.ignoreImportanceStorage = !!cell.checked;
    }
    trackTemplateIgnoreModel(model);
    rememberTemplateIgnore(model);
    log('Template ignore-importance set', {
      transfer: !!model.ignoreImportanceTransfer,
      storage: !!model.ignoreImportanceStorage,
      searchSource: model.searchSource,
    });
  }

  /**
   * Adds the two ignore-importance switches to Paletools' template step editor.
   * Off: that source follows the same importance rules as club players.
   * On: any card from that source can be used.
   */
  function installTemplateIgnoreToggles() {
    installTemplateIgnoreIdbHook();
    const Group = win.UTToggleControlGroupView;
    const proto = Group?.prototype;
    if (!proto || typeof proto.addToggleCell !== 'function') return false;
    if (proto.addToggleCell.__companionIgnore) return true;

    const originalAdd = proto.addToggleCell;
    proto.addToggleCell = function (id, label) {
      const result = originalAdd.call(this, id, label);
      if (id === 'ignore-positions') this.__companionTemplateEditor = true;
      if (
        id === 'unimportant-nations-only' &&
        this.__companionTemplateEditor &&
        !this.__companionIgnoreToggles
      ) {
        this.__companionIgnoreToggles = true;
        originalAdd.call(
          this,
          'ignore-importance-transfer',
          'Ignore Importance for Transfer List'
        );
        originalAdd.call(
          this,
          'ignore-importance-storage',
          'Ignore Importance for SBC Storage'
        );
      }
      return result;
    };
    proto.addToggleCell.__companionIgnore = true;

    if (typeof proto.addTarget === 'function') {
      const originalTarget = proto.addTarget;
      proto.addTarget = function (target, listener, eventType) {
        if (this.__companionTemplateEditor) hookTemplateEditorUpdate(target);
        if (typeof listener !== 'function' || listener.__companionIgnore) {
          return originalTarget.call(this, target, listener, eventType);
        }
        function wrapped(sender, type, cell) {
          const result = listener.apply(target, arguments);
          try {
            applyTemplateIgnoreToggle(target, cell || type);
          } catch (err) {
            log('Template ignore-importance toggle failed', err);
          }
          return result;
        }
        wrapped.__companionIgnore = true;
        return originalTarget.call(this, target, wrapped, eventType);
      };
    }
    log('Template editor ignore-importance toggles installed');
    return true;
  }

  function installChallengeSubmitDuplicateClear() {
    const names = [
      'UTSBCSquadOverviewViewController',
      'UTSBCSquadDetailPanelViewController',
      'UTSBCSquadSplitViewController',
    ];
    let installed = 0;
    for (const name of names) {
      const proto = win[name]?.prototype;
      const current = proto?._onChallengeSubmitted;
      if (typeof current !== 'function' || current.__companionDuplicateClear) continue;
      function companionOnChallengeSubmitted(obs, response) {
        try {
          if (response?.success) {
            const challenge = this._challenge;
            const items = squadClubItems(challenge);
            const squadItems = items.length ? items : collectSquadPlayerItems(this);
            if (squadItems.length) refreshTransferListAfterClubCopiesUsed(squadItems);
          }
        } catch (err) {
          log('TL duplicate clear after challenge submit failed', err);
        }
        return current.call(this, obs, response);
      }
      companionOnChallengeSubmitted.__companionDuplicateClear = true;
      proto._onChallengeSubmitted = companionOnChallengeSubmitted;
      installed += 1;
    }
    if (installed) {
      log('Challenge submit duplicate-link clear installed', { controllers: installed });
    }
    return installed > 0;
  }

  function installSbcTemplateTransferSources() {
    const drop = installSearchSourceDropdownHook();
    const search = installSquadBuilderTransferSearchHook();
    const uniqueCopies = installSbcUniquePlayerFilter();
    const ignoreToggles = installTemplateIgnoreToggles();
    const oneClickButtons = installOneClickChallengePageButtons();
    const submitClear = installChallengeSubmitDuplicateClear();
    return drop || search || uniqueCopies || ignoreToggles || oneClickButtons || submitClear;
  }

  function startObservers() {
    const start = () => {
      processDomMutation();
      installSbcTemplateTransferSources();
      const observer = new MutationObserver(() => onDomMutated());
      observer.observe(win.document.documentElement, {
        childList: true,
        subtree: true,
      });
    };

    if (win.document.documentElement) start();
    else
      win.document.addEventListener('DOMContentLoaded', start, { once: true });

    // Keep re-asserting the hook in case EA/Paletools replaces Item service methods
    win.setInterval(() => {
      if (!state.companionDomWrite) installServiceHooks();
      installPaletoolsFindLowestCapture();
      installSbcTemplateTransferSources();
    }, 2000);
  }

  win.document.addEventListener(
    'click',
    (event) => {
      try {
        const button = packOpenerLaunchButton(event.target);
        if (!button) return;
        const pack = readPackFromCard(button.closest('.ut-store-pack-details-view'));
        if (!pack?.id) return;
        state.packOpenerSourcePack = pack;
        log('Pack opener source pack', pack);
      } catch (err) {
        warn('Pack source capture failed', err);
      }
    },
    true
  );

  // On Pack Opener confirm, persist SPLIT selections and ensure hooks are live.
  // Must never throw — this runs in capture phase and would block Pack Opener start.
  win.document.addEventListener(
    'click',
    (event) => {
      try {
        const dialog = win.document.querySelector(SELECTORS.dialog);
        if (!dialog) return;

        const target = event.target;
        if (!(target instanceof win.Element)) return;

        const popup =
          dialog.closest(
            '.view-modal-container, .ut-dialog, .ea-dialog, .view-modal'
          ) || dialog.parentElement;
        if (!popup || !popup.contains(target)) return;

        const clickable = target.closest(
          'button, .btn-standard, .btn-text, .btn-primary, a'
        );
        if (!clickable) return;

        const labelLc = (clickable.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        if (labelLc === 'cancel' || labelLc === 'close') return;

        // Ignore companion panel controls (select all / reload / checkboxes)
        if (
          clickable.closest(
            '#companion-pack-rules, #companion-pack-rules-modal, #companion-settings-fab, #companion-pack-early-stop, #companion-pack-live-summary, #companion-club-scan-btn, #companion-club-scan-panel, #companion-settings-modal, #companion-pack-template-name-modal, #companion-pack-templates-panel, #companion-pack-templates-tile, #companion-pack-template-run-status'
          )
        ) {
          return;
        }

        const looksLikeConfirm =
          labelLc === 'ok' ||
          labelLc === 'confirm' ||
          labelLc === 'open' ||
          labelLc.includes('open pack') ||
          clickable.classList.contains('btn-primary');

        if (looksLikeConfirm) {
          withCompanionDomWrite(() => {
            forceNativePackCategorySelectsToFacade(dialog);
            hideNativePackCategoryPrompts(dialog);
          });
          // Clear any previous early-stop arm, then mark this run
          resetEarlyStopState();
          markPackOpenerRunning();
          const tlFullAction = rememberTransferListFullAction(dialog);
          installServiceHooks();
          // Pack Opener never opens item panels — capture digger now
          forceCapturePaletoolsFindLowest();
          resetPendingTransfers();
          log('Pack Opener confirm with companion pack rules', {
            packRules: getPackRules(),
            tlFullAction,
            tlFullSbc: rememberTlFullSbcChoice(dialog),
            importantNations: [...getImportantNationIds()],
            importantLeagues: [...getImportantLeagueIds()],
            minUndercuts: getMinUndercuts(),
            hookLive: !!(
              win.services?.Item?.discard &&
              win.services.Item.discard.__paletoolsCompanionHook
            ),
          });
        }
      } catch (err) {
        warn('Pack Opener click handler error', err);
      }
    },
    true
  );

  startObservers();
  installPaletoolsFindLowestCapture();
  getPackRules();
  log('Companion loaded.', {
    packRules: getPackRules(),
    minUndercuts: getMinUndercuts(),
  });
})();
