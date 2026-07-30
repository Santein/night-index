export type StoryFlag =
  | "rememberedMara"
  | "forgotMara"
  | "markedPattern"
  | "dismissedPattern"
  | "foundKey"
  | "keptConfession"
  | "destroyedConfession"
  | "madePromise"
  | "refusedPromise"
  | "heardMara"
  | "reviewedFinal"
  | "acceptedMara"
  | "rejectedMara"
  | "becameWitness"
  | "deniedWitness";

export type StoryFlags = Record<StoryFlag, boolean>;

export type EndingId =
  | "quiet-morning"
  | "borrowed-dawn"
  | "night-editor"
  | "no-one-missing";

export type LinkColor = "red" | "green" | "yellow" | "cyan";
export type ChoiceKind = "read" | "decision" | "return" | "ending";

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
  detail?: string;
  kind?: ChoiceKind;
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
  objective: string;
  prompt?: string;
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
  forgotMara: false,
  markedPattern: false,
  dismissedPattern: false,
  foundKey: false,
  keptConfession: false,
  destroyedConfession: false,
  madePromise: false,
  refusedPromise: false,
  heardMara: false,
  reviewedFinal: false,
  acceptedMara: false,
  rejectedMara: false,
  becameWitness: false,
  deniedWitness: false,
};

export const CORE_EVIDENCE_FLAGS: StoryFlag[] = [
  "rememberedMara",
  "markedPattern",
  "keptConfession",
  "becameWitness",
];

export const ENDING_LABELS: Record<EndingId, string> = {
  "quiet-morning": "THE QUIET MORNING",
  "borrowed-dawn": "BORROWED DAWN",
  "night-editor": "THE NIGHT EDITOR",
  "no-one-missing": "NO ONE MISSING",
};

export const PAGE_REQUIREMENTS: Partial<Record<number, StoryFlag[]>> = {
  134: ["rememberedMara"],
  135: ["forgotMara"],
  142: ["madePromise"],
  143: ["refusedPromise"],
  152: ["heardMara", "acceptedMara"],
  153: ["heardMara", "rejectedMara"],
  160: ["heardMara"],
  200: ["heardMara", "reviewedFinal"],
  201: ["heardMara", "reviewedFinal", "rememberedMara", "madePromise"],
  202: ["heardMara", "reviewedFinal", "acceptedMara", "becameWitness"],
  203: [
    "heardMara",
    "reviewedFinal",
    "rememberedMara",
    "markedPattern",
    "keptConfession",
    "becameWitness",
    "madePromise",
    "acceptedMara",
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
  detail: string,
  extra: Partial<StoryChoice> = {},
): StoryChoice {
  return { label, page, color, detail, kind: "read", ...extra };
}

function decided(yes: boolean, no: boolean) {
  return yes || no;
}

function triState(
  label: string,
  yes: boolean,
  no: boolean,
  yesText: string,
  noText: string,
  missingText: string,
) {
  const value = yes ? yesText : no ? noText : missingText;
  return `${label.padEnd(19, ".")} ${value}`;
}

function exposureMissingPages(flags: StoryFlags) {
  const pages: number[] = [];
  if (!flags.rememberedMara) pages.push(131);
  if (!flags.markedPattern) pages.push(132);
  if (!flags.keptConfession) pages.push(141);
  if (!flags.becameWitness) pages.push(888);
  if (!flags.madePromise) pages.push(140);
  if (!flags.acceptedMara) pages.push(150);
  return pages;
}

function exposureClosedBy(flags: StoryFlags) {
  const decisions: string[] = [];
  if (flags.forgotMara) decisions.push("MARA FORGOTTEN");
  if (flags.dismissedPattern) decisions.push("LOSSES DISMISSED");
  if (flags.destroyedConfession) decisions.push("ORDER DESTROYED");
  if (flags.deniedWitness) decisions.push("WITNESS REFUSED");
  if (flags.refusedPromise) decisions.push("PROMISE REFUSED");
  if (flags.rejectedMara) decisions.push("MARA REJECTED");
  return decisions;
}

function firstMissingCoreChoice(flags: StoryFlags): StoryChoice {
  if (!decided(flags.rememberedMara, flags.forgotMara)) {
    return choice(
      "DECIDE WHETHER TO KEEP MARA",
      131,
      red,
      "Choose whether Mara's name survives this playthrough.",
    );
  }
  if (!decided(flags.markedPattern, flags.dismissedPattern)) {
    return choice(
      "DECIDE IF SEVEN LOSSES MATCH",
      132,
      red,
      "Record or dismiss the yearly disappearances.",
    );
  }
  if (!decided(flags.keptConfession, flags.destroyedConfession)) {
    return choice(
      flags.foundKey ? "DECIDE PIKE'S CONFESSION" : "FIND PIKE'S ACCESS CODE",
      flags.foundKey ? 141 : 617,
      red,
      flags.foundKey
        ? "Keep or destroy the mayor's signed order."
        : "Mara printed the council recording on hidden page 617.",
    );
  }
  if (!decided(flags.becameWitness, flags.deniedWitness)) {
    return choice(
      "DECIDE IF YOU WILL TESTIFY",
      flags.heardMara ? 888 : 133,
      red,
      "Confirm or refuse your place in Bellwether's record.",
    );
  }
  return choice(
    "REVIEW THE EVIDENCE MAP",
    130,
    red,
    "See every proof and the page where it was found.",
    { kind: "return" },
  );
}

function firstMissingCommitmentChoice(flags: StoryFlags): StoryChoice {
  if (!decided(flags.madePromise, flags.refusedPromise)) {
    return choice(
      "DECIDE LEA'S PROMISE",
      140,
      green,
      "Choose whether to carry Mara's sister's promise.",
    );
  }
  if (!decided(flags.acceptedMara, flags.rejectedMara)) {
    return choice(
      "DECIDE WHETHER TO TRUST MARA",
      150,
      green,
      "Hear Mara's account, then accept or reject it.",
    );
  }
  return choice(
    "SPEAK TO MARA AGAIN",
    150,
    green,
    "Review the known cost of each final broadcast.",
    { kind: "return" },
  );
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
        objective: "Find proof before the 02:17 siren.",
        prompt: "WHERE WILL YOU BEGIN?",
        body: [
          "BELLWETHER / 13 OCT 1988 / 02:13",
          "",
          "IN FOUR MINUTES, THE FOG WILL ERASE",
          "MARA VENN FROM THIS TOWN.",
          "",
          "MARA HID HER CASE IN TELETEXT.",
          "FOLLOW HER PAGES BEFORE THE SIREN.",
          "",
          "YOUR FINAL BROADCAST WILL DECIDE:",
          "SAVE HER, REPLACE HER, EXPOSE THE",
          "TOWN, OR LET BELLWETHER FORGET.",
          "",
          endings.length
            ? `PAST ENDINGS REMEMBERED: ${endings.length}/4`
            : "NO ENDINGS REMEMBERED YET.",
        ],
        choices: [
          choice(
            "OPEN MARA'S CASE",
            120,
            red,
            "Learn who Mara was and why her file is disappearing.",
          ),
          choice(
            "LEARN THE FOG BARGAIN",
            110,
            green,
            "Understand what Bellwether does every autumn.",
          ),
          choice(
            "CHECK THE DEADLINE",
            111,
            yellow,
            "See what can still be broadcast before 02:17.",
          ),
          choice(
            endings.length ? "REVIEW PAST ENDINGS" : "LEARN HOW TO CHOOSE",
            endings.length ? 899 : 101,
            cyan,
            endings.length
              ? "Review the cost of every ending you have found."
              : "Learn the controls and how decisions change the ending.",
            { kind: "return" },
          ),
        ],
        effect: "idle",
      };

    case 101:
      return {
        page,
        section: "USER GUIDE",
        title: "HOW TO CHOOSE",
        objective: "Choose actions, not random numbers.",
        prompt: "START THE INVESTIGATION:",
        body: [
          "EVERY COLOURED LINE IS AN ACTION.",
          "THE TARGET PAGE IS PRINTED BESIDE IT.",
          "",
          "IMPORTANT DECISIONS NEED CONFIRMATION.",
          "SELECT ONCE TO READ THE COST.",
          "SELECT AGAIN TO COMMIT.",
          "",
          "SOME CLUES OPEN UNLISTED PAGES.",
          "THE NUMBER WILL ALWAYS BE PRINTED.",
          "YOU NEVER NEED TO GUESS.",
          "",
          "P151 SHOWS YOUR CHOICES AND MISSING",
          "EVIDENCE. P160 ENDS THE STORY.",
        ],
        choices: [
          choice(
            "START MARA'S CASE",
            120,
            red,
            "Begin with the erased missing-person file.",
          ),
          choice(
            "LEARN WHAT HAPPENED",
            110,
            green,
            "Read the town's bargain in plain terms.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            yellow,
            "See decisions, evidence, and exact next pages.",
            { kind: "return" },
          ),
          choice(
            "RETURN TO NIGHT INDEX",
            100,
            cyan,
            "Return to the opening page.",
            { kind: "return" },
          ),
        ],
        effect: "idle",
      };

    case 110:
      return {
        page,
        section: "THE BARGAIN",
        title: "ONE NAME FOR ONE MORNING",
        objective: "Understand why Mara was selected.",
        prompt: "WHICH PART WILL YOU VERIFY?",
        body: [
          "FOR SEVEN AUTUMNS, FOG TRIED TO",
          "ENTER BELLWETHER.",
          "",
          "MAYOR EDNA PIKE MADE A BARGAIN:",
          "THE WEATHER SERVICE PRINTS ONE NAME.",
          "AT 02:17, THAT PERSON DISAPPEARS.",
          "RECORDS AND MEMORIES REWRITE.",
          "",
          "MARA VENN FOUND THE SEVEN ORDERS.",
          "THE COUNCIL CHOSE HER TO SILENCE HER.",
          "",
          "TONIGHT, THE FOG IS TAKING MARA.",
        ],
        choices: [
          choice(
            "INVESTIGATE MARA",
            120,
            red,
            "Open Mara's erased police file.",
          ),
          choice(
            "PROVE THE SEVEN LOSSES",
            122,
            green,
            "Compare every fog drill with the next census.",
          ),
          choice(
            "SEARCH COUNCIL RECORDS",
            130,
            yellow,
            "Map the evidence Mara left behind.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Review what you know and what remains undecided.",
            { kind: "return" },
          ),
        ],
        effect: "fog",
      };

    case 111:
      return {
        page,
        section: "LIVE WEATHER",
        title: "FOUR MINUTES LEFT",
        objective: "Learn what the final broadcast can do.",
        prompt: "WHAT WILL YOU INVESTIGATE?",
        body: [
          "FOG REACHES BELLWETHER AT 02:17.",
          "CURRENT NAME: MARA VENN",
          "STATUS: HALF ERASED / IN SIGNAL",
          "",
          "ONE FINAL ORDER CAN BE SENT ON P160.",
          "IT CAN ABANDON MARA, SAVE HER AT A",
          "COST, TRADE YOUR PLACE, OR EXPOSE",
          "THE BARGAIN.",
          "",
          "EVIDENCE UNLOCKS SAFER CHOICES.",
          "YOU MUST SPEAK TO MARA BEFORE THE",
          "FINAL PAGE WILL OPEN.",
        ],
        choices: [
          choice(
            "FOLLOW MARA'S CASE",
            120,
            red,
            "Recover the identity the fog is erasing.",
          ),
          choice(
            "SEARCH FOR EVIDENCE",
            130,
            green,
            "See the four proofs needed to expose the bargain.",
          ),
          choice(
            "ANSWER MARA'S CALL",
            150,
            yellow,
            "Hear Mara's account and the cost of each ending.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Review your decisions and exact missing pages.",
            { kind: "return" },
          ),
        ],
        effect: "fog",
        soundCaption: "[WATER TICKS AGAINST THE WINDOW]",
      };

    case 120:
      return {
        page,
        section: "POLICE ARCHIVE",
        title: "MARA VENN / CASE 88-10-13",
        objective: "Recover Mara's identity and evidence.",
        prompt: "WHAT WILL YOU FOLLOW?",
        body: [
          "AGE 19 / NIGHT TELETEXT EDITOR",
          "LAST SEEN: HILL RELAY / 02:17",
          "",
          "MARA CALLED POLICE BEFORE SHE VANISHED:",
          "\"THE COUNCIL FEEDS THE FOG A NAME.\"",
          "\"I COPIED THE PROOF INTO TELETEXT.\"",
          "",
          "POLICE CLOSED HER CASE. HER NAME",
          "THEN VANISHED FROM THEIR RECORDS.",
          "",
          "RESTORE HER NAME. FIND HER PROOF.",
          "THEN CHOOSE WHO MORNING REMEMBERS.",
        ],
        choices: [
          choice(
            "RESTORE MARA'S NAME",
            121,
            red,
            "Find the paper records that still identify her.",
          ),
          choice(
            "SEARCH MARA'S EVIDENCE",
            130,
            green,
            "Open a clear map of every proof.",
          ),
          choice(
            "ANSWER MARA'S CALL",
            150,
            yellow,
            "Ask Mara what happened and what she wants.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Review your decisions and exact next steps.",
            { kind: "return" },
          ),
        ],
        effect: "scarf",
        soundCaption: "[A TELEPHONE RINGS INSIDE THE SET]",
      };

    case 121:
      return {
        page,
        section: "MISSING PERSON",
        title: "THE FADING FILE",
        objective: "Decide whether Mara's name survives.",
        prompt: "CHOOSE WHICH RECORD TO OPEN:",
        body: [
          "FILE 88-10-13",
          "NAME: M- -  V- - -",
          "AGE: 19 / NIGHT TEXT EDITOR",
          "",
          "THE FOG IS ERASING HER FILE NOW.",
          "TWO PAPER RECORDS STILL NAME HER:",
          "",
          "SCHOOL REGISTER ........ PAGE 131",
          "LEA'S UNSENT LETTER .... PAGE 140",
          "",
          "A NAME SURVIVES ONLY IF A VIEWER",
          "CHOOSES TO KEEP IT IN THE SIGNAL.",
        ],
        choices: [
          choice(
            "OPEN THE SCHOOL REGISTER",
            131,
            red,
            "Make the permanent choice to keep or erase Mara's name.",
          ),
          choice(
            "READ LEA'S LETTER",
            140,
            green,
            "Meet Mara's sister before making a promise.",
          ),
          choice(
            "PROVE THE FOG BARGAIN",
            130,
            yellow,
            "Find the evidence Mara hid in teletext.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Review every decision recorded so far.",
            { kind: "return" },
          ),
        ],
        hidden: ["REVEAL: AN AMBER SCARF NOW HANGS ON YOUR CHAIR."],
        effect: "scarf",
        soundCaption: "[FABRIC BRUSHES THE BACK OF THE CHAIR]",
      };

    case 122:
      return {
        page,
        section: "CIVIC RECORD",
        title: "SEVEN PEOPLE REMOVED",
        objective: "Verify the yearly disappearances.",
        prompt: "HOW WILL YOU TREAT THE PATTERN?",
        body: [
          "CENSUS AFTER EACH FOG DRILL:",
          "1982 / SIREN 02:17 / MINUS 1",
          "1983 / SIREN 02:17 / MINUS 1",
          "1984 / SIREN 02:17 / MINUS 1",
          "1985 / SIREN 02:17 / MINUS 1",
          "1986 / SIREN 02:17 / MINUS 1",
          "1987 / SIREN 02:17 / MINUS 1",
          "1988 / MARA VENN SELECTED",
          "",
          "EVERY DRILL REMOVED ONE RESIDENT.",
          "THE TOWN CALLED EACH LOSS AN ERROR.",
          "THE HILL RELAY LOG CAN PROVE IT.",
        ],
        choices: [
          choice(
            "EXAMINE THE HILL RELAY LOG",
            132,
            red,
            "Make the permanent choice to record or dismiss the pattern.",
          ),
          choice(
            "SEARCH PIKE'S RECORDS",
            130,
            green,
            "Find who authorized the seven disappearances.",
          ),
          choice(
            "READ MARA'S LAST FORECAST",
            133,
            yellow,
            "Find why this impossible room needs a witness.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Review evidence and unresolved choices.",
            { kind: "return" },
          ),
        ],
        effect: "relay",
      };

    case 130:
      return {
        page,
        section: "CASE FILE",
        title: "MARA'S EVIDENCE MAP",
        objective: "Collect four proofs and two commitments.",
        prompt: "CHOOSE THE NEXT PROOF:",
        body: [
          "TO BREAK THE BARGAIN, COLLECT:",
          "MARA'S NAME ................. P131",
          "SEVEN MISSING PEOPLE ........ P132",
          "PIKE'S SIGNED ORDER ......... P141",
          "AN OUTSIDE WITNESS .......... P888",
          "",
          "MARA CIRCLED ACCESS CODE: 617",
          "USE P617 TO UNLOCK P141.",
          "",
          "OPEN P133 TO FIND P888.",
          "PROOF EXPOSES THE DEAL.",
          "LEA'S PROMISE + TRUST RETURN MARA.",
          "P203 NEEDS ALL FOUR PROOFS AND BOTH.",
        ],
        choices: [
          choice(
            "DECIDE MARA'S NAME",
            131,
            red,
            "Keep her identity or let the record erase it.",
          ),
          choice(
            "DECIDE THE SEVEN LOSSES",
            132,
            green,
            "Record the pattern or accept the official explanation.",
          ),
          choice(
            "USE ACCESS CODE 617",
            617,
            yellow,
            "Open the council recording Mara marked for you.",
          ),
          choice(
            "FIND WITNESS PAGE 888",
            133,
            cyan,
            "Read Mara's last forecast before opening the mirror feed.",
          ),
        ],
        effect: "idle",
      };

    case 131:
      if (flags.rememberedMara) {
        return { ...getStoryPage(134, flags, endings)!, page };
      }
      if (flags.forgotMara) {
        return { ...getStoryPage(135, flags, endings)!, page };
      }
      return {
        page,
        section: "SCHOOL REGISTER",
        title: "WILL YOU KEEP HER NAME?",
        objective: "Make a permanent choice about Mara.",
        prompt: "SELECT ONCE FOR COST, AGAIN TO COMMIT:",
        body: [
          "BELLWETHER SCHOOL / CLASS OF 1986",
          "",
          "LEA VENN",
          "MARA VENN ................. [FADING]",
          "",
          "UNDER MARA'S PHOTOGRAPH:",
          "\"WRITE MY NAME WHERE LIGHT CAN SEE.\"",
          "",
          "KEEPING HER NAME ENABLES A RESCUE.",
          "SAVING MARA ALONE WILL NOT END THE",
          "BARGAIN. THE FOG MAY TAKE ANOTHER.",
          "",
          "THIS CHOICE CANNOT BE CHANGED.",
        ],
        choices: [
          choice(
            "KEEP MARA'S NAME",
            134,
            red,
            "Records Mara's name; rescue also requires Lea's promise.",
            {
              kind: "decision",
              set: { rememberedMara: true },
            },
          ),
          choice(
            "LET MARA'S NAME FADE",
            135,
            green,
            "Her identity is lost for this playthrough.",
            {
              kind: "decision",
              set: { forgotMara: true },
            },
          ),
          choice(
            "READ LEA'S LETTER FIRST",
            140,
            yellow,
            "Meet Mara's sister before deciding.",
          ),
          choice(
            "RETURN TO THE EVIDENCE MAP",
            130,
            cyan,
            "Leave this decision unresolved for now.",
            { kind: "return" },
          ),
        ],
        effect: "scarf",
      };

    case 134:
      return {
        page,
        section: "DECISION RECORDED",
        title: "YOU KEEP MARA'S NAME",
        objective: "Decide what else you will preserve.",
        prompt: "WHAT WILL YOU DO NEXT?",
        body: [
          "YOU TYPE: MARA VENN.",
          "",
          "THE LETTERS STOP FLICKERING.",
          "HER PHOTOGRAPH DEVELOPS A FACE.",
          "AN AMBER SCARF APPEARS ON YOUR CHAIR.",
          "",
          "MARA'S NAME CAN NOW BE SENT ON P160.",
          "RESCUE ALSO REQUIRES LEA'S PROMISE.",
          "",
          "THE BARGAIN WOULD STILL SEEK A NAME.",
          "ONLY A COMPLETE CASE CAN END IT.",
        ],
        choices: [
          choice(
            "READ LEA'S PROMISE",
            140,
            red,
            "Decide whether you will promise to bring Mara home.",
          ),
          choice(
            "PROVE THE SEVEN LOSSES",
            132,
            green,
            "Build the first public proof of the bargain.",
          ),
          choice(
            "SPEAK TO MARA",
            150,
            yellow,
            "Hear the cost of saving her.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Mara's name is now marked as kept.",
            { kind: "return" },
          ),
        ],
        effect: "scarf",
        soundCaption: "[THE AMBER SCARF SETTLES ON YOUR CHAIR]",
      };

    case 135:
      return {
        page,
        section: "DECISION RECORDED",
        title: "YOU LET HER NAME FADE",
        objective: "Choose what can still be done.",
        prompt: "WHAT WILL YOU DO NEXT?",
        body: [
          "YOU LEAVE THE LINE BLANK.",
          "",
          "MARA'S PHOTOGRAPH TURNS PALE.",
          "THE LAST TWO LETTERS OF VENN VANISH.",
          "THE CORRIDOR FIGURE STEPS BACK.",
          "",
          "MARA CANNOT BE SAVED BY NAME IN THIS",
          "PLAYTHROUGH. OTHER ENDINGS REMAIN.",
          "",
          "YOU CAN STILL TAKE HER PLACE OR SEARCH",
          "FOR ENOUGH PROOF TO UNDERSTAND THE",
          "BARGAIN YOU CHOSE NOT TO NAME.",
        ],
        choices: [
          choice(
            "SEARCH FOR OTHER EVIDENCE",
            130,
            red,
            "Continue the case without Mara's identity.",
          ),
          choice(
            "SPEAK TO MARA",
            150,
            green,
            "Tell Mara what you chose and hear her response.",
          ),
          choice(
            "FIND THE OUTSIDE WITNESS",
            133,
            yellow,
            "Learn why this room exists.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Mara's name is now marked as forgotten.",
            { kind: "return" },
          ),
        ],
        effect: "ending-dark",
      };

    case 132:
      if (flags.markedPattern || flags.dismissedPattern) {
        return {
          page,
          section: "DECISION RECORDED",
          title: flags.markedPattern
            ? "SEVEN LOSSES MARKED"
            : "PATTERN DISMISSED",
          objective: "Follow Mara's access code to the council.",
          prompt: "MARA LEFT THE NEXT PAGE:",
          body: [
            flags.markedPattern
              ? "YOU MARK ALL SEVEN DATES AS EVIDENCE."
              : "YOU ACCEPT THE LOSSES AS PRINT ERRORS.",
            "",
            flags.markedPattern
              ? "THE RELAY PRINTS: PATTERN PRESERVED."
              : "THE RELAY PRINTS: PATTERN REJECTED.",
            "",
            "MARA'S HANDWRITING REMAINS BELOW:",
            "\"COUNCIL RECORDING / PAGE 617\"",
            "",
            "P617 EXPLAINS WHO ORDERED THE LOSSES",
            "AND UNLOCKS PIKE'S SIGNED CONFESSION",
            "ON PAGE 141.",
          ],
          choices: [
            choice(
              "USE MARA'S CODE 617",
              617,
              red,
              "Open the hidden council recording.",
            ),
            choice(
              "READ MARA'S LAST FORECAST",
              133,
              green,
              "Find the outside witness page.",
            ),
            choice(
              "SPEAK TO MARA",
              150,
              yellow,
              "Ask what the seven losses cost her.",
            ),
            choice(
              "OPEN CASE NOTES",
              151,
              cyan,
              "Review how this decision changed the case.",
              { kind: "return" },
            ),
          ],
          effect: "relay",
        };
      }
      return {
        page,
        section: "HILL RELAY",
        title: "WILL YOU MARK THE PATTERN?",
        objective: "Decide whether seven losses are proof.",
        prompt: "SELECT ONCE FOR COST, AGAIN TO COMMIT:",
        body: [
          "HILL RELAY LOG / 1982 TO 1988",
          "82  NAME SENT / ONE PERSON MISSING",
          "83  NAME SENT / ONE PERSON MISSING",
          "84  NAME SENT / ONE PERSON MISSING",
          "85  NAME SENT / ONE PERSON MISSING",
          "86  NAME SENT / ONE PERSON MISSING",
          "87  NAME SENT / ONE PERSON MISSING",
          "88  MARA STOPPED THE TRANSMISSION",
          "",
          "THIS LOG LINKS SEVEN LOSSES TO THE FOG.",
          "MARA WROTE: \"COUNCIL TAPE / P617\"",
          "",
          "THIS CHOICE CANNOT BE CHANGED.",
        ],
        choices: [
          choice(
            "MARK ALL SEVEN LOSSES",
            132,
            red,
            "The pattern becomes evidence for exposing the bargain.",
            {
              kind: "decision",
              set: { markedPattern: true },
            },
          ),
          choice(
            "DISMISS THEM AS ERRORS",
            132,
            green,
            "The pattern is rejected for this playthrough.",
            {
              kind: "decision",
              set: { dismissedPattern: true },
            },
          ),
          choice(
            "USE MARA'S CODE 617",
            617,
            yellow,
            "Delay the decision and open the hidden council recording.",
          ),
          choice(
            "RETURN TO THE EVIDENCE MAP",
            130,
            cyan,
            "Leave this decision unresolved for now.",
            { kind: "return" },
          ),
        ],
        effect: "relay",
        soundCaption: "[THE RELAY HUM DROPS TO 52 HZ]",
      };

    case 133:
      return {
        page,
        section: "LAST FORECAST",
        title: "THE WITNESS IS ON PAGE 888",
        objective: "Learn why the television needs you.",
        prompt: "MARA PRINTED THE NEXT PAGE:",
        body: [
          "MARA'S LAST FORECAST / 02:16:58",
          "",
          "\"ROOM 214 IS NOT IN 1988.",
          "CEDAR COURT WAS DEMOLISHED IN 1991.",
          "",
          "THE TELEVISION BUILT THIS ROOM AROUND",
          "A VIEWER WHO EXISTS OUTSIDE THE TOWN'S",
          "REWRITTEN RECORDS.",
          "",
          "AN OUTSIDE WITNESS CAN BREAK THE DEAL.",
          "MIRROR CAMERA FEED: PAGE 888",
          "",
          "OPEN P888 AND CHOOSE YOUR ROLE.\"",
        ],
        choices: [
          choice(
            "OPEN MIRROR PAGE 888",
            888,
            red,
            "Confirm or refuse your role as the outside witness.",
          ),
          choice(
            "ASK MARA WHAT THIS MEANS",
            150,
            green,
            "Hear why Mara built the room around a viewer.",
          ),
          choice(
            "RETURN TO THE EVIDENCE MAP",
            130,
            yellow,
            "Review the other proof needed to expose the bargain.",
            { kind: "return" },
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "The witness page is now clearly identified as P888.",
            { kind: "return" },
          ),
        ],
        hidden: ["REVEAL: TURN TO PAGE 888. NO OTHER NUMBER IS A CLUE."],
        effect: "mirror",
        soundCaption: "[A SECOND CHAIR CREAKS IN THE GLASS]",
      };

    case 140:
      if (flags.madePromise) {
        return { ...getStoryPage(142, flags, endings)!, page };
      }
      if (flags.refusedPromise) {
        return { ...getStoryPage(143, flags, endings)!, page };
      }
      return {
        page,
        section: "UNSENT LETTER",
        title: "WILL YOU CARRY LEA'S PROMISE?",
        objective: "Make a permanent promise to Mara's sister.",
        prompt: "SELECT ONCE FOR COST, AGAIN TO COMMIT:",
        body: [
          "LEA VENN / 12 OCT 1988",
          "",
          "\"MARA, IF THIS PAGE SURVIVES, THEY",
          "CHOSE YOU. I PROMISED TO SAY YOUR",
          "NAME UNTIL SOMEONE REMEMBERED IT.",
          "",
          "VIEWER: TAKE MY PROMISE IF YOU MEAN IT.",
          "A PROMISE CAN BRING MARA HOME.",
          "IT CANNOT END THE BARGAIN ALONE.",
          "",
          "LEA\"",
          "",
          "THIS CHOICE CANNOT BE CHANGED.",
        ],
        choices: [
          choice(
            "CARRY LEA'S PROMISE",
            142,
            red,
            "Records Lea's promise; rescue also requires Mara's name.",
            {
              kind: "decision",
              set: { madePromise: true },
            },
          ),
          choice(
            "REFUSE LEA'S PROMISE",
            143,
            green,
            "You will not be able to rescue Mara by name.",
            {
              kind: "decision",
              set: { refusedPromise: true },
            },
          ),
          choice(
            "FIND PROOF BEFORE DECIDING",
            130,
            yellow,
            "Leave the promise unresolved and investigate further.",
          ),
          choice(
            "RETURN TO MARA'S FILE",
            121,
            cyan,
            "Review Mara's fading police record.",
            { kind: "return" },
          ),
        ],
        effect: "letter",
        soundCaption: "[PAPER FOLDS ITSELF ON THE TABLE]",
      };

    case 142:
      return {
        page,
        section: "DECISION RECORDED",
        title: "YOU CARRY LEA'S PROMISE",
        objective: "Decide how to fulfil the promise.",
        prompt: "WHAT WILL YOU DO NEXT?",
        body: [
          "YOU TYPE: I WILL SAY HER NAME.",
          "",
          "LEA'S LETTER PRINTS A SECOND COPY.",
          "THE PAPER ON YOUR TABLE UNFOLDS.",
          "",
          "P201 ALSO REQUIRES MARA'S NAME.",
          "IF OPEN, IT CAN BRING HER HOME.",
          "THE BARGAIN WILL STILL DEMAND",
          "SOMEONE ELSE.",
          "",
          "A COMPLETE CASE AND MARA'S TRUST CAN",
          "BREAK THE BARGAIN INSTEAD.",
        ],
        choices: [
          choice(
            "DECIDE MARA'S NAME",
            131,
            red,
            "The rescue ending also needs Mara's identity.",
          ),
          choice(
            "BUILD THE COMPLETE CASE",
            130,
            green,
            "Search for the proof that could save everyone.",
          ),
          choice(
            "SPEAK TO MARA",
            150,
            yellow,
            "Tell Mara you carry Lea's promise.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Lea's promise is now marked as made.",
            { kind: "return" },
          ),
        ],
        effect: "letter",
      };

    case 143:
      return {
        page,
        section: "DECISION RECORDED",
        title: "YOU REFUSE LEA'S PROMISE",
        objective: "Choose what responsibility remains.",
        prompt: "WHAT WILL YOU DO NEXT?",
        body: [
          "YOU TYPE: I CANNOT PROMISE THAT.",
          "",
          "LEA'S LETTER FOLDS INTO A SMALLER",
          "RECTANGLE. HER SIGNATURE DISAPPEARS.",
          "",
          "MARA CANNOT BE RESCUED BY NAME IN THIS",
          "PLAYTHROUGH. YOU CAN STILL TAKE HER",
          "PLACE OR INVESTIGATE THE BARGAIN.",
          "",
          "THE ROOM KEEPS AN EXACT RECORD OF YOUR",
          "REFUSAL.",
        ],
        choices: [
          choice(
            "SEARCH FOR OTHER EVIDENCE",
            130,
            red,
            "Continue investigating without Lea's promise.",
          ),
          choice(
            "SPEAK TO MARA",
            150,
            green,
            "Tell Mara what you refused.",
          ),
          choice(
            "FIND THE OUTSIDE WITNESS",
            133,
            yellow,
            "Learn whether you can take a different role.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "Lea's promise is now marked as refused.",
            { kind: "return" },
          ),
        ],
        effect: "letter",
      };

    case 141:
      if (!flags.foundKey) {
        return {
          page,
          section: "SEALED",
          title: "PIKE'S SIGNED ORDER IS LOCKED",
          objective: "Use the printed access code on page 617.",
          prompt: "THE KEY IS NOT A GUESS:",
          body: [
            "AUTHENTICATION REQUIRED.",
            "",
            "MARA HID THE KEY IN A COUNCIL",
            "RECORDING ON PAGE 617.",
            "",
            "THE EVIDENCE MAP ON P130 AND THE",
            "HILL RELAY LOG ON P132 BOTH PRINT",
            "THE SAME ACCESS PAGE.",
            "",
            "OPEN P617. IT WILL UNLOCK THIS FILE.",
          ],
          choices: [
            choice(
              "USE ACCESS CODE 617",
              617,
              red,
              "Open Mara's hidden council recording.",
            ),
            choice(
              "RETURN TO THE EVIDENCE MAP",
              130,
              green,
              "Review every proof and access page.",
              { kind: "return" },
            ),
            choice(
              "READ THE HILL RELAY LOG",
              132,
              yellow,
              "See where Mara wrote page 617.",
            ),
            choice(
              "OPEN CASE NOTES",
              151,
              cyan,
              "Pike's confession remains locked until P617.",
              { kind: "return" },
            ),
          ],
          effect: "sealed",
        };
      }
      if (flags.keptConfession || flags.destroyedConfession) {
        return {
          page,
          section: "DECISION RECORDED",
          title: flags.keptConfession
            ? "PIKE'S ORDER PRESERVED"
            : "PIKE'S ORDER DESTROYED",
          objective: "Choose what evidence or trust remains.",
          prompt: "WHAT WILL YOU DO NEXT?",
          body: [
            flags.keptConfession
              ? "YOU KEEP PIKE'S SIGNED CONFESSION."
              : "YOU DELETE PIKE'S SIGNED CONFESSION.",
            "",
            flags.keptConfession
              ? "THE MAYOR'S NAME STAYS ON THE ORDER."
              : "THE MAYOR'S SIGNATURE BURNS TO STATIC.",
            "",
            flags.keptConfession
              ? "THIS PROOF CAN BE SENT ON P203."
              : "P203 CANNOT OPEN IN THIS PLAYTHROUGH.",
            "",
            "MARA'S LIVE LINE IS STILL OPEN.",
            "THE FINAL BROADCAST WAITS UNTIL YOU",
            "HAVE HEARD WHAT EACH CHOICE COSTS.",
          ],
          choices: [
            choice(
              "SPEAK TO MARA",
              150,
              red,
              "Hear the cost of every final broadcast.",
            ),
            choice(
              "FIND THE OUTSIDE WITNESS",
              133,
              green,
              "Open the proof that exists outside town records.",
            ),
            choice(
              "RETURN TO THE EVIDENCE MAP",
              130,
              yellow,
              "Review the evidence you kept or destroyed.",
              { kind: "return" },
            ),
            choice(
              "OPEN CASE NOTES",
              151,
              cyan,
              "See how Pike's order is recorded.",
              { kind: "return" },
            ),
          ],
          effect: "sealed",
        };
      }
      return {
        page,
        section: "DECLASSIFIED",
        title: "WILL YOU KEEP PIKE'S CONFESSION?",
        objective: "Make a permanent choice about the proof.",
        prompt: "SELECT ONCE FOR COST, AGAIN TO COMMIT:",
        body: [
          "SIGNED: MAYOR EDNA PIKE / 12 OCT 1988",
          "\"I ORDERED ONE CITIZEN'S NAME SENT",
          "TO THE FOG EACH YEAR. IT SPARED",
          "EVERYONE ELSE.",
          "",
          "SEVEN PEOPLE WERE ERASED.",
          "MARA FOUND THE ORDERS.",
          "WE CHOSE MARA TO SILENCE HER.",
          "",
          "NAME, DATES, ORDER, AND A WITNESS",
          "CAN STOP THE FOG CHOOSING ONE VICTIM.\"",
          "",
          "THIS CHOICE CANNOT BE CHANGED.",
        ],
        choices: [
          choice(
            "KEEP PIKE'S CONFESSION",
            141,
            red,
            "The signed order becomes evidence for exposing the bargain.",
            {
              kind: "decision",
              set: { keptConfession: true },
            },
          ),
          choice(
            "DESTROY PIKE'S CONFESSION",
            141,
            green,
            "The signed order is lost for this playthrough.",
            {
              kind: "decision",
              set: { destroyedConfession: true },
            },
          ),
          choice(
            "ASK MARA WHAT IT COSTS",
            150,
            yellow,
            "Leave the confession unresolved and speak to Mara.",
          ),
          choice(
            "RETURN TO THE EVIDENCE MAP",
            130,
            cyan,
            "Leave this decision unresolved for now.",
            { kind: "return" },
          ),
        ],
        effect: "sealed",
      };

    case 150:
      if (flags.acceptedMara) {
        return { ...getStoryPage(152, flags, endings)!, page };
      }
      if (flags.rejectedMara) {
        return { ...getStoryPage(153, flags, endings)!, page };
      }
      return {
        page,
        section: "LIVE TEXT LINK",
        title: "WILL YOU TRUST MARA?",
        objective: "Hear Mara, then make a permanent choice.",
        prompt: "SELECT ONCE FOR COST, AGAIN TO COMMIT:",
        body: [
          "MARA: THE FOG ERASED MY BODY FROM",
          "TOWN. I HELD MYSELF IN THIS SIGNAL.",
          "",
          "PRINT MY NAME: I RETURN, ANOTHER GOES.",
          "TAKE MY PLACE: I RETURN, YOU STAY HERE.",
          "AIR ALL PROOF: WITH LEA'S PROMISE",
          "AND YOUR TRUST, THE BARGAIN MAY BREAK.",
          "",
          "I BUILT ROOM 214 AROUND A VIEWER",
          "OUTSIDE BELLWETHER'S MEMORY.",
          "",
          "MARA: I CANNOT PROVE I AM STILL MARA.",
          "WILL YOU TREAT ME AS IF I AM?",
        ],
        choices: [
          choice(
            "TRUST MARA'S IDENTITY",
            152,
            red,
            "You accept Mara as real and keep the exchange ending possible.",
            {
              kind: "decision",
              set: { heardMara: true, acceptedMara: true },
            },
          ),
          choice(
            "REFUSE MARA'S IDENTITY",
            153,
            green,
            "You reject Mara's claim for this playthrough.",
            {
              kind: "decision",
              set: { heardMara: true, rejectedMara: true },
            },
          ),
          choice(
            "DEMAND PROOF ON PAGE 888",
            133,
            yellow,
            "Leave trust unresolved and follow Mara's witness clue.",
            { set: { heardMara: true } },
          ),
          choice(
            "REVIEW THE CASE FIRST",
            151,
            cyan,
            "Leave trust unresolved and check every missing page.",
            { kind: "return", set: { heardMara: true } },
          ),
        ],
        visitSets: { heardMara: true },
        effect: "live",
        soundCaption: "[TELETYPE RELAYS PRINT INSIDE THE WALL]",
      };

    case 152:
      return {
        page,
        section: "DECISION RECORDED",
        title: "YOU TRUST MARA",
        objective: "Decide whether to risk yourself or expose town.",
        prompt: "WHAT WILL YOU DO NEXT?",
        body: [
          "YOU TYPE: I BELIEVE YOU ARE MARA VENN.",
          "",
          "THE WOMAN IN THE CORRIDOR LOOKS UP.",
          "HER FACE MATCHES THE SCHOOL REGISTER.",
          "",
          "TRUST ALONE DOES NOT OFFER YOUR PLACE.",
          "P202 ALSO REQUIRES YOU TO CONFIRM THE",
          "WITNESS ROLE ON PAGE 888.",
          "",
          "P203 ALSO NEEDS FOUR PROOFS AND",
          "LEA'S PROMISE. CHECK P151 TO SEE",
          "WHETHER THAT ENDING REMAINS OPEN.",
        ],
        choices: [
          choice(
            "CONFIRM THE WITNESS ON P888",
            888,
            red,
            "Choose whether you consent to enter the record.",
          ),
          choice(
            "BUILD THE COMPLETE CASE",
            130,
            green,
            "Search for the proof that can save everyone.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            yellow,
            "Mara's identity is now marked as trusted.",
            { kind: "return" },
          ),
          choice(
            "REVIEW FINAL OPTIONS",
            160,
            cyan,
            "See every ending and its known cost.",
          ),
        ],
        effect: "live",
      };

    case 153:
      return {
        page,
        section: "DECISION RECORDED",
        title: "YOU REFUSE MARA",
        objective: "Choose what the evidence can still prove.",
        prompt: "WHAT WILL YOU DO NEXT?",
        body: [
          "YOU TYPE: I CANNOT KNOW WHO YOU ARE.",
          "",
          "THE LIVE LINE GOES QUIET.",
          "THE CORRIDOR FIGURE LOSES ITS FACE.",
          "",
          "YOU CANNOT TAKE MARA'S PLACE OR OPEN",
          "THE COMPLETE EXPOSURE ENDING IN THIS",
          "PLAYTHROUGH.",
          "",
          "YOU CAN STILL RESCUE HER BY NAME IF",
          "YOU KEPT HER IDENTITY AND LEA'S PROMISE.",
        ],
        choices: [
          choice(
            "DECIDE MARA'S NAME",
            131,
            red,
            "A name and promise can still bring Mara home.",
          ),
          choice(
            "DECIDE LEA'S PROMISE",
            140,
            green,
            "Choose whether to carry her sister's request.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            yellow,
            "Mara's identity is now marked as rejected.",
            { kind: "return" },
          ),
          choice(
            "REVIEW FINAL OPTIONS",
            160,
            cyan,
            "See which endings remain available.",
          ),
        ],
        effect: "ending-dark",
      };

    case 151: {
      const coreCount = CORE_EVIDENCE_FLAGS.filter((flag) => flags[flag]).length;
      const coreChoice = firstMissingCoreChoice(flags);
      const commitmentChoice = firstMissingCommitmentChoice(flags);
      return {
        page,
        section: "CASE NOTES",
        title: "YOUR STORY SO FAR",
        objective: "Resolve choices, then choose a broadcast.",
        prompt: "FOLLOW A MISSING ITEM OR CONTINUE:",
        body: [
          "BELLWETHER ERASES ONE NAME EACH FOG.",
          "MARA FOUND THE ORDERS AND WAS CHOSEN.",
          "",
          triState(
            "MARA'S NAME",
            flags.rememberedMara,
            flags.forgotMara,
            "KEPT",
            "FORGOTTEN",
            "GET P131",
          ),
          triState(
            "SEVEN LOSSES",
            flags.markedPattern,
            flags.dismissedPattern,
            "MARKED",
            "DISMISSED",
            "GET P132",
          ),
          triState(
            "PIKE'S ORDER",
            flags.keptConfession,
            flags.destroyedConfession,
            "KEPT",
            "DESTROYED",
            flags.foundKey ? "GET P141" : "GET P617",
          ),
          triState(
            "OUTSIDE WITNESS",
            flags.becameWitness,
            flags.deniedWitness,
            "HERE",
            "REFUSED",
            "GET P133",
          ),
          triState(
            "LEA'S PROMISE",
            flags.madePromise,
            flags.refusedPromise,
            "MADE",
            "REFUSED",
            "GET P140",
          ),
          triState(
            "MARA'S IDENTITY",
            flags.acceptedMara,
            flags.rejectedMara,
            "TRUSTED",
            "REJECTED",
            "GET P150",
          ),
          "",
          `CORE EVIDENCE: ${coreCount}/4`,
          flags.heardMara
            ? "FINAL BROADCAST READY ON PAGE 160."
            : "SPEAK TO MARA ON P150 BEFORE P160.",
        ],
        choices: [
          coreChoice,
          commitmentChoice,
          choice(
            "REVIEW THE FULL EVIDENCE MAP",
            130,
            yellow,
            "See every proof and unlisted page in one place.",
            { kind: "return" },
          ),
          flags.heardMara
            ? choice(
                "CHOOSE THE FINAL BROADCAST",
                160,
                cyan,
                "Review every ending and its known cost before confirming.",
              )
            : choice(
                "HEAR MARA BEFORE DECIDING",
                150,
                cyan,
                "The final page stays closed until Mara explains the costs.",
              ),
        ],
        effect: "live",
      };
    }

    case 160: {
      const missing = exposureMissingPages(flags);
      const closedBy = exposureClosedBy(flags);
      const rescueClosedBy = [
        flags.forgotMara ? "MARA'S NAME WAS FORGOTTEN" : "",
        flags.refusedPromise ? "LEA'S PROMISE WAS REFUSED" : "",
      ].filter(Boolean);
      const exchangeClosedBy = [
        flags.rejectedMara ? "MARA'S IDENTITY WAS REJECTED" : "",
        flags.deniedWitness ? "THE WITNESS ROLE WAS REFUSED" : "",
      ].filter(Boolean);
      return {
        page,
        section: "FINAL BROADCAST",
        title: "THE SIREN HAS STARTED",
        objective: "Choose an informed ending.",
        prompt: "SELECT ONCE FOR COST, AGAIN TO END:",
        body: [
          "YOUR NEXT CHOICE ENDS THIS STORY.",
          "",
          "P200 ABANDON MARA.",
          "SHE IS FORGOTTEN. THE TOWN WAKES.",
          "",
          "P201 SAVE MARA BY NAME.",
          "SHE RETURNS. THE FOG TAKES ANOTHER.",
          "",
          "P202 TAKE MARA'S PLACE.",
          "SHE RETURNS. YOU REMAIN IN THE SET.",
          "",
          "P203 EXPOSE THE BARGAIN.",
          "NEEDS 4 PROOFS + PROMISE + TRUST.",
          closedBy.length
            ? `CLOSED BY: ${closedBy.join(", ")}`
            : missing.length
              ? `STILL NEED PAGES: ${missing.join(", ")}`
              : "COMPLETE CASE: NO ONE DISAPPEARS.",
        ],
        choices: [
          choice(
            "ABANDON MARA",
            200,
            red,
            "Mara is forgotten. No additional resident is taken tonight.",
            {
              kind: "ending",
              ending: "quiet-morning",
            },
          ),
          choice(
            "SAVE MARA, LOSE ANOTHER",
            201,
            green,
            "Mara returns, but the unfinished bargain erases someone else.",
            {
              kind: "ending",
              requires: PAGE_REQUIREMENTS[201],
              lockedMessage: rescueClosedBy.length
                ? `CLOSED THIS PLAYTHROUGH: ${rescueClosedBy.join(", ")}.`
                : "KEEP MARA'S NAME ON P131 AND LEA'S PROMISE ON P140.",
              ending: "borrowed-dawn",
            },
          ),
          choice(
            "TAKE MARA'S PLACE",
            202,
            yellow,
            "Mara returns. You consent to remain as the night editor.",
            {
              kind: "ending",
              requires: PAGE_REQUIREMENTS[202],
              lockedMessage: exchangeClosedBy.length
                ? `CLOSED THIS PLAYTHROUGH: ${exchangeClosedBy.join(", ")}.`
                : "TRUST MARA ON P150 AND CONFIRM THE WITNESS ON P888.",
              ending: "night-editor",
            },
          ),
          choice(
            "EXPOSE THE BARGAIN",
            203,
            cyan,
            "Broadcast every proof. With a complete case, no one vanishes.",
            {
              kind: "ending",
              requires: PAGE_REQUIREMENTS[203],
              lockedMessage: closedBy.length
                ? `CLOSED BY YOUR DECISIONS: ${closedBy.join(", ")}.`
                : missing.length
                  ? `COMPLETE THESE PAGES FIRST: ${missing.join(", ")}.`
                  : "THE COMPLETE CASE IS NOT READY.",
              ending: "no-one-missing",
            },
          ),
        ],
        visitSets: { reviewedFinal: true },
        effect: "countdown",
        soundCaption: "[THE TOWN SIREN DRAWS BREATH]",
      };
    }

    case 200:
      return {
        page,
        section: "ENDING I",
        title: "THE QUIET MORNING",
        objective: "Mara is forgotten; the bargain continues.",
        prompt: "THIS ENDING IS NOW REMEMBERED:",
        body: [
          "YOU CUT THE CARRIER.",
          "",
          "MARA'S LAST PAGE TURNS TO STATIC.",
          "AT 02:17, THE FOG ACCEPTS HER NAME",
          "AND LEAVES BELLWETHER.",
          "",
          "THE TOWN WAKES WITH 2,440 PEOPLE.",
          "NO ONE REMEMBERS MARA VENN.",
          "",
          "ROOM 214 DISSOLVES AROUND YOUR CHAIR.",
          "YOU WRITE MARA'S NAME ON YOUR HAND.",
          "",
          "AT DAWN, EVEN THE INK IS BLANK.",
        ],
        choices: [
          choice(
            "REPLAY WITH DIFFERENT CHOICES",
            120,
            red,
            "Reset this playthrough but keep discovered endings.",
            { kind: "return", restart: true },
          ),
          choice(
            "REVIEW ALL ENDINGS",
            899,
            green,
            "See the cost of every remembered ending.",
            { kind: "return", restart: true },
          ),
        ],
        effect: "ending-dark",
        terminal: true,
      };

    case 201:
      return {
        page,
        section: "ENDING II",
        title: "BORROWED DAWN",
        objective: "Mara returns; another resident is erased.",
        prompt: "THIS ENDING IS NOW REMEMBERED:",
        body: [
          "YOU PRINT: MARA VENN.",
          "",
          "EVERY TELEVISION HOLDS HER NAME.",
          "THE FOG RELEASES MARA BY THE RESERVOIR.",
          "LEA REMEMBERS HER SISTER.",
          "",
          "BUT THE BARGAIN STILL NEEDS ONE NAME.",
          "ACROSS TOWN, A BOY'S BED IS EMPTY.",
          "HIS MOTHER CANNOT REMEMBER HER TEARS.",
          "",
          "MARA IS HOME. SOMEONE ELSE IS GONE.",
          "YOU KEPT THE PROMISE, NOT THE TOWN.",
        ],
        choices: [
          choice(
            "REPLAY AND BREAK THE BARGAIN",
            120,
            red,
            "Reset the case and search for all four proofs.",
            { kind: "return", restart: true },
          ),
          choice(
            "REVIEW ALL ENDINGS",
            899,
            green,
            "See the cost of every remembered ending.",
            { kind: "return", restart: true },
          ),
        ],
        effect: "ending-amber",
        terminal: true,
      };

    case 202:
      return {
        page,
        section: "ENDING III",
        title: "THE NIGHT EDITOR",
        objective: "Mara returns; you remain in the signal.",
        prompt: "THIS ENDING IS NOW REMEMBERED:",
        body: [
          "YOU PRINT: TAKE THE WITNESS.",
          "",
          "THE SIGNAL ACCEPTS YOUR CONSENT.",
          "IT RELEASES MARA INTO THE ROAD.",
          "",
          "NO BELLWETHER RESIDENT IS ERASED.",
          "THE FOG TAKES YOUR PLACE INSTEAD.",
          "",
          "YOU REMAIN AS GREEN WORDS ON BLACK,",
          "TENDING THE CARRIER AFTER MIDNIGHT.",
          "",
          "MARA READS THE LAST LINE YOU TYPE:",
          "\"GOOD EVENING. NO ONE IS MISSING.\"",
        ],
        choices: [
          choice(
            "REPLAY AND EXPOSE THE BARGAIN",
            120,
            red,
            "Reset the case and search for the complete proof.",
            { kind: "return", restart: true },
          ),
          choice(
            "REVIEW ALL ENDINGS",
            899,
            green,
            "See the cost of every remembered ending.",
            { kind: "return", restart: true },
          ),
        ],
        effect: "ending-green",
        terminal: true,
      };

    case 203:
      return {
        page,
        section: "ENDING IV",
        title: "NO ONE MISSING",
        objective: "The bargain is exposed and broken.",
        prompt: "THIS ENDING IS NOW REMEMBERED:",
        body: [
          "YOU BROADCAST MARA'S NAME, THE SEVEN",
          "LOSSES, PIKE'S ORDER, AND YOUR IMAGE.",
          "YOU KEEP LEA'S PROMISE AND TRUST MARA.",
          "",
          "EVERY SCREEN SHOWS THE BARGAIN.",
          "2,441 PEOPLE REMEMBER IT AT ONCE.",
          "",
          "THE FOG CANNOT ISOLATE ONE VICTIM.",
          "THE SIREN INHALES AND FALLS SILENT.",
          "",
          "AT DAWN, MARA WALKS HOME WITH LEA.",
          "MAYOR PIKE REMEMBERS EVERY NAME.",
          "",
          "CENSUS: 2,441 / NO ONE MISSING.",
        ],
        choices: [
          choice(
            "REPLAY ANOTHER PATH",
            120,
            red,
            "Reset the case while keeping remembered endings.",
            { kind: "return", restart: true },
          ),
          choice(
            "REVIEW ALL ENDINGS",
            899,
            green,
            "See the cost of every remembered ending.",
            { kind: "return", restart: true },
          ),
        ],
        effect: "ending-dawn",
        terminal: true,
      };

    case 617:
      return {
        page,
        section: "UNLISTED PAGE",
        title: "COUNCIL RECORDING / 1988",
        objective: "Use the recording to unlock Pike's order.",
        prompt: "THE SIGNED ORDER IS NOW OPEN:",
        body: [
          "PIKE: ONE PRINTED NAME BUYS ONE YEAR.",
          "MARA: AND IF THE NAME STAYS PUBLIC?",
          "PIKE: THEN THE FOG CANNOT TAKE IT.",
          "",
          "MARA: WHAT IF EVERYONE SEES THE DEAL?",
          "PIKE: IT COULD NOT CHOOSE ONE VICTIM.",
          "",
          "PIKE: REMOVE MARA FROM THE INDEX.",
          "MARA: TOO LATE. A VIEWER HAS THIS.",
          "",
          "ACCESS KEY ACCEPTED.",
          "PIKE'S SIGNED ORDER OPEN ON PAGE 141.",
        ],
        choices: [
          choice(
            "OPEN PIKE'S ORDER",
            141,
            red,
            "Read the mayor's confession, then keep or destroy it.",
          ),
          choice(
            "RETURN TO THE EVIDENCE MAP",
            130,
            green,
            "Review the other proof needed to expose the bargain.",
            { kind: "return" },
          ),
          choice(
            "ASK MARA ABOUT THE COST",
            150,
            yellow,
            "Hear what every final broadcast will do.",
          ),
          choice(
            "OPEN CASE NOTES",
            151,
            cyan,
            "The access key is found; Pike's order is now open.",
            { kind: "return" },
          ),
        ],
        visitSets: { foundKey: true },
        effect: "sealed",
        soundCaption: "[THIRTEEN SECONDS OF CARRIER TONE]",
      };

    case 888:
      if (flags.becameWitness || flags.deniedWitness) {
        return {
          page,
          section: "DECISION RECORDED",
          title: flags.becameWitness
            ? "YOU ENTER THE RECORD"
            : "YOU REFUSE THE RECORD",
          objective: "Choose what to do with your recorded role.",
          prompt: "WHAT WILL YOU DO NEXT?",
          body: [
            flags.becameWitness
              ? "YOU TYPE: I AM HERE. I SAW IT."
              : "YOU TYPE: I AM NOT PART OF THIS.",
            "",
            flags.becameWitness
              ? "YOUR REFLECTION STAYS ON THE SCREEN."
              : "YOUR REFLECTION TURNS AWAY.",
            "",
            flags.becameWitness
              ? "YOU CAN TESTIFY OR CONSENT TO TAKE"
              : "YOU CANNOT TESTIFY OR TAKE MARA'S",
            flags.becameWitness
              ? "MARA'S PLACE ON THE FINAL PAGE."
              : "PLACE IN THIS PLAYTHROUGH.",
            "",
            "MARA'S LIVE LINE AND THE CASE NOTES",
            "REMAIN AVAILABLE.",
          ],
          choices: [
            choice(
              "SPEAK TO MARA",
              150,
              red,
              "Hear how your witness role changes the final choices.",
            ),
            choice(
              "RETURN TO THE EVIDENCE MAP",
              130,
              green,
              "Review the other proof and commitments.",
              { kind: "return" },
            ),
            choice(
              "OPEN CASE NOTES",
              151,
              yellow,
              "See how your witness choice is recorded.",
              { kind: "return" },
            ),
            choice(
              "REVIEW FINAL OPTIONS",
              160,
              cyan,
              "Available only after you have heard Mara.",
              {
                requires: ["heardMara"],
                lockedMessage: "SPEAK TO MARA ON PAGE 150 FIRST.",
              },
            ),
          ],
          effect: "mirror",
        };
      }
      return {
        page,
        section: "MIRROR CAMERA",
        title: "WILL YOU ENTER THE RECORD?",
        objective: "Make a permanent choice about your role.",
        prompt: "SELECT ONCE FOR COST, AGAIN TO COMMIT:",
        body: [
          "CEDAR COURT WAS DEMOLISHED IN 1991.",
          "THIS TELEVISION REBUILT ROOM 214",
          "AROUND A VIEWER: YOU.",
          "",
          "THE COUNCIL CANNOT REWRITE SOMEONE",
          "OUTSIDE BELLWETHER'S RECORDS.",
          "",
          "CONFIRMING MAKES YOU THE WITNESS",
          "NEEDED TO EXPOSE THE BARGAIN.",
          "IT ALSO LETS YOU CONSENT TO TAKE",
          "MARA'S PLACE.",
          "",
          "THIS CHOICE CANNOT BE CHANGED.",
        ],
        choices: [
          choice(
            "CONFIRM: I AM HERE",
            888,
            red,
            "Records the witness requirement for P202 and P203.",
            {
              kind: "decision",
              set: { becameWitness: true },
            },
          ),
          choice(
            "REFUSE THE WITNESS ROLE",
            888,
            green,
            "You stay outside the record; witness endings close.",
            {
              kind: "decision",
              set: { deniedWitness: true },
            },
          ),
          choice(
            "ASK MARA WHAT THIS MEANS",
            150,
            yellow,
            "Leave the decision unresolved and speak to Mara.",
          ),
          choice(
            "RETURN TO THE EVIDENCE MAP",
            130,
            cyan,
            "Leave the witness choice unresolved for now.",
            { kind: "return" },
          ),
        ],
        effect: "mirror",
        soundCaption: "[A SECOND CHAIR CREAKS IN THE GLASS]",
      };

    case 899:
      return {
        page,
        section: "ENDINGS ARCHIVE",
        title: "WHAT EACH CHOICE COST",
        objective: "Replay with a specific ending in mind.",
        prompt: "CHOOSE HOW TO REPLAY:",
        body: [
          endings.includes("quiet-morning")
            ? "I   QUIET MORNING / MARA FORGOTTEN"
            : "I   [NOT YET SEEN]",
          endings.includes("borrowed-dawn")
            ? "II  BORROWED DAWN / ANOTHER TAKEN"
            : "II  [NOT YET SEEN]",
          endings.includes("night-editor")
            ? "III NIGHT EDITOR / YOU TAKE HER PLACE"
            : "III [NOT YET SEEN]",
          endings.includes("no-one-missing")
            ? "IV  NO ONE MISSING / BARGAIN EXPOSED"
            : "IV  [NOT YET SEEN]",
          "",
          `${endings.length}/4 ENDINGS REMEMBERED`,
          "",
          "REPLAY WITH A GOAL.",
          "P151 TELLS YOU EXACTLY WHICH CHOICES",
          "AND PAGES EACH ENDING STILL NEEDS.",
        ],
        choices: [
          choice(
            "REPLAY MARA'S CASE",
            120,
            red,
            "Reset all story choices but keep remembered endings.",
            { kind: "return", restart: true },
          ),
          choice(
            "REVIEW ENDING REQUIREMENTS",
            151,
            green,
            "Reset, then see the complete case checklist.",
            { kind: "return", restart: true },
          ),
          choice(
            "LEARN HOW TO CHOOSE",
            101,
            yellow,
            "Review controls and confirmation behavior.",
            { kind: "return", restart: true },
          ),
          choice(
            "RETURN TO NIGHT INDEX",
            100,
            cyan,
            "Return to the opening page with a fresh case.",
            { kind: "return", restart: true },
          ),
        ],
        effect: "idle",
      };

    default:
      return null;
  }
}

export const INDEXED_PAGES = [
  100, 101, 110, 111, 120, 121, 122, 130, 131, 132, 133, 134, 135, 140,
  141, 142, 143, 150, 151, 152, 153, 160, 200, 201, 202, 203, 899,
];
