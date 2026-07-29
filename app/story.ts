export type StoryFlag =
  | "rememberedMara"
  | "markedPattern"
  | "foundKey"
  | "keptConfession"
  | "madePromise"
  | "acceptedMara"
  | "becameWitness";

export type StoryFlags = Record<StoryFlag, boolean>;

export type EndingId =
  | "quiet-morning"
  | "borrowed-dawn"
  | "night-editor"
  | "no-one-missing";

export type LinkColor = "red" | "green" | "yellow" | "cyan";

export type PageEffect =
  | "idle"
  | "fog"
  | "scarf"
  | "relay"
  | "letter"
  | "sealed"
  | "mirror"
  | "live"
  | "countdown"
  | "ending-dark"
  | "ending-amber"
  | "ending-green"
  | "ending-dawn";

export interface StoryChoice {
  label: string;
  page: number;
  color: LinkColor;
  set?: Partial<StoryFlags>;
  requires?: StoryFlag[];
  lockedMessage?: string;
  ending?: EndingId;
  restart?: boolean;
}

export interface StoryPage {
  page: number;
  section: string;
  title: string;
  body: string[];
  choices: StoryChoice[];
  hidden?: string[];
  visitSets?: Partial<StoryFlags>;
  effect: PageEffect;
  soundCaption?: string;
  terminal?: boolean;
}

export const INITIAL_FLAGS: StoryFlags = {
  rememberedMara: false,
  markedPattern: false,
  foundKey: false,
  keptConfession: false,
  madePromise: false,
  acceptedMara: false,
  becameWitness: false,
};

export const ENDING_LABELS: Record<EndingId, string> = {
  "quiet-morning": "THE QUIET MORNING",
  "borrowed-dawn": "BORROWED DAWN",
  "night-editor": "THE NIGHT EDITOR",
  "no-one-missing": "NO ONE MISSING",
};

export const ENDING_REQUIREMENTS: Partial<Record<number, StoryFlag[]>> = {
  201: ["rememberedMara", "madePromise"],
  202: ["acceptedMara"],
  203: [
    "rememberedMara",
    "markedPattern",
    "keptConfession",
    "becameWitness",
  ],
};

const red = "red" as const;
const green = "green" as const;
const yellow = "yellow" as const;
const cyan = "cyan" as const;

function choice(
  label: string,
  page: number,
  color: LinkColor,
  extra: Partial<StoryChoice> = {},
): StoryChoice {
  return { label, page, color, ...extra };
}

function statusLine(label: string, value: boolean, yes: string, no: string) {
  return `${label.padEnd(18, ".")} ${value ? yes : no}`;
}

export function requirementsMet(
  requirements: StoryFlag[] | undefined,
  flags: StoryFlags,
) {
  return requirements?.every((flag) => flags[flag]) ?? true;
}

export function getStoryPage(
  page: number,
  flags: StoryFlags,
  endings: EndingId[],
): StoryPage | null {
  switch (page) {
    case 100:
      return {
        page,
        section: "NIGHT INDEX",
        title: "THE QUIET FORECAST",
        body: [
          "LOCAL NIGHT SERVICE",
          "",
          "A FOG WARNING IS NOW IN EFFECT.",
          "REMAIN INDOORS UNTIL THE SIREN ENDS.",
          "",
          "THIS SET IS REGISTERED TO:",
          "ROOM 214 / CEDAR MOTOR COURT",
          "",
          "YOU DID NOT REGISTER IT.",
          "",
          endings.length
            ? `PREVIOUS FORECASTS: ${endings.length}/4 REMEMBERED`
            : "NO PREVIOUS FORECASTS FOUND.",
          "",
          "TYPE ANY THREE-DIGIT PAGE NUMBER.",
        ],
        choices: [
          choice("LOCAL NEWS 110", 110, red),
          choice("WEATHER 111", 111, green),
          choice("POLICE LOG 120", 120, yellow),
          ...(endings.length
            ? [choice("ENDINGS 899", 899, cyan)]
            : [choice("HOW TO USE 101", 101, cyan)]),
        ],
        effect: "idle",
      };

    case 101:
      return {
        page,
        section: "USER GUIDE",
        title: "HOW TO READ THE NIGHT",
        body: [
          "SELECT A COLOURED LINK ON THE SCREEN,",
          "OR TYPE A THREE-DIGIT PAGE NUMBER.",
          "",
          "KEYBOARD:",
          "0-9 PAGE  /  ENTER TUNE",
          "ARROWS SELECT  /  R REVEAL",
          "H HOLD  /  Z SIZE  /  M SOUND",
          "",
          "SOME PAGES ARE NOT IN THE INDEX.",
          "NUMBERS PRINTED INSIDE REPORTS MAY",
          "LEAD SOMEWHERE.",
          "",
          "THE SET REMEMBERS ENDINGS.",
          "THE ROOM REMEMBERS EVERYTHING ELSE.",
        ],
        choices: [
          choice("INDEX 100", 100, red),
          choice("NEWS 110", 110, green),
          choice("WEATHER 111", 111, yellow),
          choice("POLICE 120", 120, cyan),
        ],
        effect: "idle",
      };

    case 110:
      return {
        page,
        section: "LOCAL NEWS",
        title: "FOG DRILL DECLARED A SUCCESS",
        body: [
          "13 OCT 1988",
          "",
          "THE RESERVOIR ROAD REOPENED AT DAWN.",
          "OFFICIALS REPORT NO INJURIES AND",
          "NO RESIDENTS MISSING.",
          "",
          "CENSUS, 12 OCT: 2,441",
          "CENSUS, 13 OCT: 2,440",
          "",
          "THE DISCREPANCY IS A PRINTING ERROR.",
          "PLEASE DO NOT TELEPHONE THE STATION.",
        ],
        choices: [
          choice("MISSING 121", 121, red),
          choice("CIVIC RECORD 122", 122, green),
          choice("POLICE 120", 120, yellow),
          choice("INDEX 100", 100, cyan),
        ],
        effect: "idle",
      };

    case 111:
      return {
        page,
        section: "WEATHER",
        title: "NOT FOR BROADCAST",
        body: [
          "ISSUED 02:09",
          "",
          "FOG: RISING FROM EMPTY RESERVOIR",
          "WIND: INWARD, ALL DIRECTIONS",
          "VISIBILITY: ONE PERSON",
          "SUNRISE: PENDING CONFIRMATION",
          "",
          "IF THE TELEVISION USES YOUR NAME,",
          "DO NOT ANSWER FROM ACROSS THE ROOM.",
          "",
          "LAST MANUAL ENTRY:",
          "M. VENN / HILL RELAY / 02:17",
        ],
        choices: [
          choice("PREVIOUS YEARS 122", 122, red),
          choice("LAST FORECAST 133", 133, green),
          choice("LIVE SERVICE 150", 150, yellow),
          choice("INDEX 100", 100, cyan),
        ],
        hidden: ["HIDDEN FIELD: THE WINDOW IS OUTSIDE."],
        effect: "fog",
        soundCaption: "[WATER TICKS AGAINST THE WINDOW]",
      };

    case 120:
      return {
        page,
        section: "POLICE / LIVE",
        title: "INCIDENT LOG",
        body: [
          "DATE FIELD: 13 OCT [INVALID]",
          "",
          "02:04  WOMAN REPORTS HER TV KNOWS",
          "       HER CHILDHOOD NAME.",
          "02:09  CALL ENDS BEFORE IT BEGINS.",
          "02:11  ROOM 214 REQUESTS AN OFFICER.",
          "02:12  DISPATCH: CEDAR MOTOR COURT",
          "       WAS DEMOLISHED IN 1991.",
          "02:13  ROOM 214 CALLS AGAIN.",
          "       LINE IS INSIDE TELEVISION.",
        ],
        choices: [
          choice("CASE ARCHIVE 130", 130, red),
          choice("ANSWER LINE 150", 150, green),
          choice("LOCAL NEWS 110", 110, yellow),
          choice("INDEX 100", 100, cyan),
        ],
        effect: "idle",
        soundCaption: "[A TELEPHONE RINGS INSIDE THE SET]",
      };

    case 121:
      return {
        page,
        section: "MISSING",
        title: "FILE 88-10-13 / PARTLY ERASED",
        body: [
          flags.rememberedMara ? "NAME: MARA VENN" : "NAME: M- -  V- - -",
          "AGE: 19",
          "OCCUPATION: NIGHT TEXT EDITOR",
          "LAST SEEN: HILL RELAY / 02:17",
          "CLOTHING: GREY COAT, AMBER SCARF",
          "",
          "DISTINGUISHING FEATURE:",
          "EVERYONE INSISTS SHE NEVER LIVED.",
          "",
          flags.rememberedMara
            ? "STATUS: REMEMBERED BY 1 VIEWER"
            : "STATUS: RECORD FAILING",
        ],
        choices: [
          choice("SCHOOL ROLL 131", 131, red),
          choice("LETTER 140", 140, green),
          choice("CIVIC RECORD 122", 122, yellow),
          choice("NEWS 110", 110, cyan),
        ],
        hidden: ["REVEAL: THE SCARF IS BEHIND YOU."],
        effect: "scarf",
        soundCaption: "[FABRIC BRUSHES THE BACK OF THE CHAIR]",
      };

    case 122:
      return {
        page,
        section: "CIVIC RECORD",
        title: "FOG DRILLS",
        body: [
          "YEAR   SIREN       NEXT CENSUS",
          "1982   02:17       -1",
          "1983   02:17       -1",
          "1984   02:17       -1",
          "1985   02:17       -1",
          "1986   02:17       -1",
          "1987   02:17       -1",
          "1988   02:17       [RECORD ENDS]",
          "",
          "ONE WEATHER ORDER WAS FILED BEFORE",
          "EACH CORRECTION. NO NAMES SURVIVE.",
          "",
          "WEATHER IS WHAT WE CALL A CHOICE",
          "AFTER EVERYONE FORGETS IT.",
        ],
        choices: [
          choice("RELAY LOG 132", 132, red),
          choice("LETTER 140", 140, green),
          choice("ARCHIVE 130", 130, yellow),
          choice("INDEX 100", 100, cyan),
        ],
        effect: "relay",
      };

    case 130:
      return {
        page,
        section: "POLICE ARCHIVE",
        title: "CASE INDEX",
        body: [
          "121  MISSING PERSON / CORRUPT",
          "131  SCHOOL ROLL / PUBLIC",
          "132  HILL RELAY LOG / PUBLIC",
          "133  LAST FORECAST / DAMAGED",
          "140  UNDELIVERED LETTER / PUBLIC",
          "141  SIGNED STATEMENT / SEALED",
          "",
          "SEARCH RESULT:",
          "UNLISTED MINUTES: 0",
          "",
          "THE CURSOR PAUSES AFTER THAT ZERO.",
        ],
        choices: [
          choice("SCHOOL ROLL 131", 131, red),
          choice("RELAY LOG 132", 132, green),
          choice("FORECAST 133", 133, yellow),
          choice("LETTER 140", 140, cyan),
        ],
        hidden: ["REVEAL: ZERO BECOMES 6 / 1 / 7."],
        effect: "idle",
      };

    case 131:
      return {
        page,
        section: "SCHOOL ROLL",
        title: "CLASS OF 1986 / VOLUME II",
        body: [
          "...",
          "LEA VENN",
          "[PALE RECTANGLE]",
          flags.rememberedMara ? "MARA VENN" : "MARA VENN [FLICKERING]",
          "...",
          "",
          "HANDWRITTEN UNDER THE PHOTOGRAPH:",
          "IF A NAME LEAVES THE PAPER,",
          "WRITE IT SOMEWHERE LIGHT CAN SEE.",
          "",
          flags.rememberedMara
            ? "YOU ARE RESPONSIBLE FOR THIS NAME."
            : "REMEMBER MARA VENN?",
        ],
        choices: [
          choice("YES, REMEMBER", 151, red, {
            set: { rememberedMara: true },
          }),
          choice("LEAVE IT BLANK", 151, green),
          choice("MISSING 121", 121, yellow),
          choice("ARCHIVE 130", 130, cyan),
        ],
        effect: "idle",
      };

    case 132:
      return {
        page,
        section: "HILL RELAY",
        title: "MAINTENANCE LOG",
        body: [
          "ENGINEER: E. PIKE",
          "",
          "82  CARRIER 02:17 / COUNT -1",
          "83  CARRIER 02:17 / COUNT -1",
          "84  CARRIER 02:17 / COUNT -1",
          "85  CARRIER 02:17 / COUNT -1",
          "86  CARRIER 02:17 / COUNT -1",
          "87  CARRIER 02:17 / COUNT -1",
          "88  CARRIER 02:17 / M.V. REFUSED",
          "",
          "THE CHOICE MUST BE PRINTED BEFORE",
          "THE SIREN, OR THE FOG CHOOSES.",
          "",
          "SERVICE ACCESS TAG: 6 / 1 / 7",
        ],
        choices: [
          choice("MARK SEVEN DATES", 151, red, {
            set: { markedPattern: true },
          }),
          choice("IGNORE PATTERN", 151, green),
          choice("FORECAST 133", 133, yellow),
          choice("ARCHIVE 130", 130, cyan),
        ],
        effect: "relay",
        soundCaption: "[THE RELAY HUM DROPS TO 52 HZ]",
      };

    case 133:
      return {
        page,
        section: "WEATHER TAPE",
        title: "RECOVERED 02:16:58",
        body: [
          "PRESSURE ............. 888 MB",
          "HUMIDITY ............. 88%",
          "VISIBILITY ........... 8 METRES",
          "FORECAST ............. REPEATING",
          "",
          "EIGHT STREETS WITH NO FOOTSTEPS.",
          "EIGHT PHONES RING IN EMPTY ROOMS.",
          "EIGHT WINDOWS GLOW UNDER THE WATER.",
          "",
          "WHEN THREE EIGHTS AGREE,",
          "THE GLASS LOOKS BACK.",
        ],
        choices: [
          choice("LETTER 140", 140, red),
          choice("LIVE SERVICE 150", 150, green),
          choice("RELAY LOG 132", 132, yellow),
          choice("ARCHIVE 130", 130, cyan),
        ],
        hidden: ["REVEAL: MIRROR PAGE 888 IS LISTENING."],
        effect: "fog",
      };

    case 140:
      return {
        page,
        section: "UNDELIVERED",
        title: "LETTER FROM LEA VENN",
        body: [
          "12 OCT 1988",
          "",
          "MARA,",
          "",
          "THE SIREN MADE MOTHER ASK WHO YOU",
          "WERE. I WROTE YOUR NAME UNDER MY",
          "TONGUE.",
          "",
          "IF I FORGET TOMORROW, THAT IS NOT",
          "PERMISSION. DO NOT LET THEM TURN YOU",
          "INTO WEATHER.",
          "",
          "SAY HER NAME WHERE EVERYONE CAN SEE.",
        ],
        choices: [
          choice("MAKE LEA'S PROMISE", 150, red, {
            set: { madePromise: true },
          }),
          choice("MAKE NO PROMISE", 150, green),
          choice("MISSING 121", 121, yellow),
          choice("ARCHIVE 130", 130, cyan),
        ],
        effect: "letter",
        soundCaption: "[PAPER FOLDS ITSELF ON THE TABLE]",
      };

    case 141:
      if (!flags.foundKey) {
        return {
          page,
          section: "SEALED",
          title: "SIGNED STATEMENT",
          body: [
            "AUTHENTICATION REQUIRED.",
            "",
            "THE LOCK ACCEPTS THREE DIGITS.",
            "",
            "A MAINTENANCE TAG WAS REMOVED",
            "FROM THE PUBLIC INDEX.",
          ],
          choices: [
            choice("RELAY LOG 132", 132, red),
            choice("ARCHIVE 130", 130, green),
            choice("MEMORY 151", 151, yellow),
            choice("INDEX 100", 100, cyan),
          ],
          effect: "sealed",
        };
      }
      return {
        page,
        section: "DECLASSIFIED",
        title: "SIGNED: MAYOR EDNA PIKE",
        body: [
          "12 OCT 1988 / 23:54",
          "",
          "I SIGNED ALL SEVEN WEATHER ORDERS.",
          "WE DID NOT STOP THE FOG. WE TAUGHT",
          "BELLWETHER NOT TO NOTICE ITS HUNGER.",
          "",
          "MARA FOUND THE CARRIER CODE.",
          "WE SELECTED HER BEFORE SHE COULD",
          "PRINT THE OTHER NAMES.",
          "",
          "AT DAWN I WILL FORGET HER.",
          "THIS STATEMENT IS THE ONLY COPY.",
        ],
        choices: [
          choice("KEEP THE RECORD", 151, red, {
            set: { keptConfession: true },
          }),
          choice("ERASE THE RECORD", 151, green),
          choice("LIVE SERVICE 150", 150, yellow),
          choice("ARCHIVE 130", 130, cyan),
        ],
        effect: "sealed",
      };

    case 150:
      return {
        page,
        section: "NIGHT SERVICE",
        title: "CALL CONNECTED 02:16:21",
        body: [
          "MARA: DO NOT TURN AROUND.",
          "MARA: THE ROOM ENDS BEHIND YOUR CHAIR.",
          "MARA: I HELD THE CARRIER OPEN.",
          "MARA: EVERY VIEWER MAKES ME CLEARER.",
          "MARA: EVERY ENDING TAKES A NAME.",
          "",
          "MARA: I CANNOT PROVE I AM STILL MARA.",
          "MARA: WILL YOU TREAT ME AS IF I AM?",
          "",
          flags.acceptedMara
            ? "MARA: THEN CHOOSE BEFORE THE SIREN."
            : "THE LINE WAITS FOR YOUR ANSWER.",
        ],
        choices: [
          choice("YES, MARA", 151, red, {
            set: { acceptedMara: true },
          }),
          choice("NO, PROVE IT", 151, green),
          choice("MEMORY CHECK 151", 151, yellow),
          choice("TRANSMIT 160", 160, cyan),
        ],
        effect: "live",
        soundCaption: "[TELETYPE RELAYS PRINT IN THE WALL]",
      };

    case 151:
      return {
        page,
        section: "MEMORY CHECK",
        title: "CARRIER CAPACITY",
        body: [
          statusLine("MARA VENN", flags.rememberedMara, "KEPT", "BLANK"),
          statusLine("SEVEN DATES", flags.markedPattern, "MARKED", "BLANK"),
          statusLine("SIGNED ORDER", flags.keptConfession, "KEPT", "SEALED"),
          statusLine("THE WITNESS", flags.becameWitness, "HERE", "UNSEEN"),
          statusLine("LEA'S PROMISE", flags.madePromise, "MADE", "UNMADE"),
          statusLine("MARA'S REQUEST", flags.acceptedMara, "YES", "UNPROVEN"),
          "",
          "A FULL RECORD CAN BE SENT WITHOUT",
          "GIVING THE FOG A REPLACEMENT.",
          "",
          `${Object.values(flags).filter(Boolean).length}/7 SIGNALS HELD`,
        ],
        choices: [
          choice("SEARCH 130", 130, red),
          choice("RETURN TO MARA 150", 150, green),
          choice("FINAL TRANSMISSION 160", 160, yellow),
          choice("INDEX 100", 100, cyan),
        ],
        effect: "live",
      };

    case 160:
      return {
        page,
        section: "FINAL",
        title: "SIREN IN 00:00:30",
        body: [
          "ONE INSTRUCTION MAY BE SENT.",
          "",
          "200 CUT THE CARRIER",
          "    LEAVE BELLWETHER QUIET.",
          "",
          "201 PRINT: MARA VENN",
          "    REQUIRES NAME + PROMISE.",
          "",
          "202 OFFER THE WITNESS",
          "    REQUIRES MARA ACCEPTED.",
          "",
          "203 PRINT EVERY RECORD",
          "    REQUIRES FOUR COMPLETE RECORDS.",
        ],
        choices: [
          choice("CUT CARRIER 200", 200, red, {
            ending: "quiet-morning",
          }),
          choice("PRINT MARA 201", 201, green, {
            requires: ["rememberedMara", "madePromise"],
            lockedMessage: "NAME AND PROMISE ARE INCOMPLETE.",
            ending: "borrowed-dawn",
          }),
          choice("OFFER WITNESS 202", 202, yellow, {
            requires: ["acceptedMara"],
            lockedMessage: "MARA'S REQUEST IS UNANSWERED.",
            ending: "night-editor",
          }),
          choice("PRINT ALL 203", 203, cyan, {
            requires: [
              "rememberedMara",
              "markedPattern",
              "keptConfession",
              "becameWitness",
            ],
            lockedMessage: "THE COMPLETE RECORD IS NOT HELD.",
            ending: "no-one-missing",
          }),
        ],
        effect: "countdown",
        soundCaption: "[THE TOWN SIREN DRAWS BREATH]",
      };

    case 200:
      return {
        page,
        section: "NO SIGNAL",
        title: "THE QUIET MORNING",
        body: [
          "YOU PRESS POWER.",
          "",
          "THE GLASS CONTRACTS TO A WHITE POINT.",
          "THE WALLPAPER, CARPET, AND YOUR SHADOW",
          "CONTRACT WITH IT.",
          "",
          "AT 02:17 BELLWETHER SLEEPS.",
          "POPULATION: 2,440.",
          "",
          "NO ONE REMEMBERS MARA VENN.",
          "FOR ONE CLEAN SECOND, NEITHER DO YOU.",
          "THEN THERE IS NO YOU LEFT TO MIND.",
          "",
          "ENDING I",
        ],
        choices: [
          choice("BEGIN AGAIN 100", 100, red, { restart: true }),
          choice("ENDINGS 899", 899, green, { restart: true }),
        ],
        effect: "ending-dark",
        terminal: true,
      };

    case 201:
      return {
        page,
        section: "EMERGENCY",
        title: "BORROWED DAWN",
        body: [
          "MARA VENN / MARA VENN / MARA VENN",
          "",
          "EVERY TELEVISION IN BELLWETHER",
          "PRINTS IT.",
          "",
          "AT THE ROADSIDE, A WOMAN IN AN AMBER",
          "SCARF APPEARS, NINETEEN AND SOAKED.",
          "LEA REMEMBERS A SISTER AND CRIES.",
          "",
          "THE FOG TURNS AWAY FROM MARA.",
          "BY DAWN ANOTHER HOUSE IS ONE ROOM",
          "SHORT.",
          "",
          "ENDING II",
        ],
        choices: [
          choice("BEGIN AGAIN 100", 100, red, { restart: true }),
          choice("ENDINGS 899", 899, green, { restart: true }),
        ],
        effect: "ending-amber",
        terminal: true,
      };

    case 202:
      return {
        page,
        section: "NIGHT SERVICE",
        title: "THE NIGHT EDITOR",
        body: [
          "YOU OFFER YOUR NAME.",
          "THE SET CANNOT FIND ONE OUTSIDE GLASS.",
          "",
          "SO IT TAKES THE ONLY WORD IT GAVE YOU:",
          "",
          "WITNESS",
          "",
          "MARA STEPS THROUGH THE PLACE WHERE THE",
          "MOTEL WALL USED TO BE. MORNING FOLLOWS.",
          "",
          "YOU REMAIN AS GREEN LETTERS ON BLACK.",
          "AT 02:17, YOU TYPE: GOOD EVENING.",
          "",
          "ENDING III",
        ],
        choices: [
          choice("BEGIN AGAIN 100", 100, red, { restart: true }),
          choice("ENDINGS 899", 899, green, { restart: true }),
        ],
        effect: "ending-green",
        terminal: true,
      };

    case 203:
      return {
        page,
        section: "EMERGENCY",
        title: "NO ONE MISSING",
        body: [
          "NO NAME WILL BE REMOVED.",
          "",
          "SEVEN DATES. ONE SIGNED ORDER.",
          "MARA'S NAME. YOUR IMPOSSIBLE REFLECTION.",
          "EVERY HIDDEN PAGE FLOODS THE CARRIER.",
          "",
          "2,441 PEOPLE REMEMBER AT ONCE.",
          "THE SIREN INHALES AND CANNOT EXHALE.",
          "",
          "AT DAWN, THE RESERVOIR HOLDS WATER.",
          "CEDAR COURT HAS ONE OCCUPIED ROOM.",
          "",
          "CENSUS: 2,442",
          "WEATHER: UNPREDICTABLE",
          "",
          "ENDING IV",
        ],
        choices: [
          choice("BEGIN AGAIN 100", 100, red, { restart: true }),
          choice("ENDINGS 899", 899, green, { restart: true }),
        ],
        effect: "ending-dawn",
        terminal: true,
      };

    case 617:
      return {
        page,
        section: "UNLISTED",
        title: "COUNCIL FEED / 23:51",
        body: [
          "RECOVERED RELAY LOG / 12 OCT 1988",
          "",
          "PIKE: ONE NAME BUYS ONE MORNING.",
          "VOICE: IF THE NAME STAYS PRINTED?",
          "PIKE: THEN THE FOG CANNOT FINISH.",
          "MARA: GOOD. PRINT THIS PART.",
          "",
          "[THIRTEEN SECONDS OF CARRIER TONE]",
          "",
          "PIKE: REMOVE HER FROM THE INDEX.",
          "VOICE: SHE IS STILL TYPING.",
          "",
          "ACCESS ACCEPTED.",
          "SEALED STATEMENT OPEN ON 141.",
        ],
        choices: [
          choice("STATEMENT 141", 141, red),
          choice("RELAY LOG 132", 132, green),
          choice("MEMORY 151", 151, yellow),
          choice("INDEX 100", 100, cyan),
        ],
        visitSets: { foundKey: true },
        effect: "sealed",
        soundCaption: "[THIRTEEN SECONDS OF CARRIER TONE]",
      };

    case 888:
      return {
        page,
        section: "MIRROR PAGE",
        title: "LIVE CAMERA: ROOM 214",
        body: [
          "OCCUPANCY ........ 1",
          "REGISTERED GUEST .. NONE",
          "REFLECTED GUEST ... [YOU]",
          "ATTEMPTS TONIGHT .. 7",
          "",
          "EACH TIME YOU SWITCH OFF, PAGE 100",
          "REBUILDS THIS ROOM FROM YOUR LAST",
          "MEMORY.",
          "",
          "MARA IS NOT THE ONLY ONE IN THE",
          "SIGNAL. BELLWETHER HAS BEEN READING",
          "YOU BACK, ONE LINE AT A TIME.",
          "",
          "CONFIRM: I AM HERE",
        ],
        choices: [
          choice("YES, I AM HERE", 151, red, {
            set: { becameWitness: true },
          }),
          choice("NO REFLECTION", 151, green),
          choice("LIVE SERVICE 150", 150, yellow),
          choice("FORECAST 133", 133, cyan),
        ],
        effect: "mirror",
        soundCaption: "[A SECOND CHAIR CREAKS IN THE GLASS]",
      };

    case 899:
      return {
        page,
        section: "ARCHIVE",
        title: "PREVIOUS FORECASTS",
        body: [
          ...(
            Object.keys(ENDING_LABELS) as EndingId[]
          ).map((ending, index) => {
            const remembered = endings.includes(ending);
            return `${index + 1}. ${remembered ? ENDING_LABELS[ending] : "[NOT REMEMBERED]"}`;
          }),
          "",
          endings.length === 4
            ? "ALL FOUR FORECASTS OCCUPY THE SET."
            : `${4 - endings.length} FORECASTS REMAIN UNSEEN.`,
          "",
          "STORY CLUES RESET WHEN YOU BEGIN AGAIN.",
          "REMEMBERED ENDINGS REMAIN IN THE GLASS.",
          "",
          "UNLISTED PAGES DO NOT APPEAR HERE.",
        ],
        choices: [
          choice("BEGIN AGAIN 100", 100, red, { restart: true }),
          choice("MEMORY CHECK 151", 151, green),
          choice("USER GUIDE 101", 101, yellow),
          choice("INDEX 100", 100, cyan),
        ],
        effect: "idle",
      };

    default:
      return null;
  }
}

export const INDEXED_PAGES = [
  100, 101, 110, 111, 120, 121, 122, 130, 131, 132, 133, 140, 141, 150,
  151, 160, 200, 201, 202, 203, 899,
];
