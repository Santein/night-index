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
      "FOLLOW THE FADING NAME",
      131,
      red,
      "The school register still holds the shape of Mara's name.",
    );
  }
  if (!decided(flags.markedPattern, flags.dismissedPattern)) {
    return choice(
      "COUNT THE EMPTY CHAIRS",
      132,
      red,
      "Seven sirens left seven spaces in the census.",
    );
  }
  if (!decided(flags.keptConfession, flags.destroyedConfession)) {
    return choice(
      flags.foundKey ? "READ PIKE'S ORDER" : "LISTEN AT 617",
      flags.foundKey ? 141 : 617,
      red,
      flags.foundKey
        ? "Pike's signature is waiting under the seal."
        : "Mara wrote 617 beside the council carbon.",
    );
  }
  if (!decided(flags.becameWitness, flags.deniedWitness)) {
    return choice(
      "LOOK INTO THE BLACK GLASS",
      flags.heardMara ? 888 : 133,
      red,
      "A camera is waiting for the room that should not exist.",
    );
  }
  return choice(
    "RETURN TO MARA'S DESK",
    130,
    red,
    "Her red-pencil page still lies beneath the forecast.",
    { kind: "return" },
  );
}

function firstMissingCommitmentChoice(flags: StoryFlags): StoryChoice {
  if (!decided(flags.madePromise, flags.refusedPromise)) {
    return choice(
      "OPEN LEA'S LETTER",
      140,
      green,
      "Her sister left one sentence unfinished.",
    );
  }
  if (!decided(flags.acceptedMara, flags.rejectedMara)) {
    return choice(
      "ANSWER MARA",
      150,
      green,
      "A woman's voice is still moving through the text.",
    );
  }
  return choice(
    "ANSWER MARA AGAIN",
    150,
    green,
    "The live line has not gone quiet.",
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
        objective: "THE NAME IN THE FORECAST IS FADING.",
        prompt: "WHICH PART OF THE NIGHT DO YOU OPEN?",
        body: [
          "BELLWETHER / 13 OCT 1988 / 02:13",
          "",
          "WEATHER SERVICE: FOG AT 02:17.",
          "ONE RESIDENT MAY NOT REACH MORNING.",
          "",
          "A SECOND MESSAGE BREAKS THROUGH:",
          "",
          "\"MY NAME IS MARA VENN.",
          "THEY HAVE PUT ME IN THE FORECAST.",
          "",
          "I HID WHAT I FOUND IN THESE PAGES.",
          "IF YOU CAN STILL READ THIS,",
          "I HAVE NOT GONE YET.\"",
          endings.length
            ? `THIS SET REMEMBERS ${endings.length} OTHER MORNINGS.`
            : "",
        ],
        choices: [
          choice(
            "OPEN MARA'S FILE",
            120,
            red,
            "The police carbon is losing letters.",
          ),
          choice(
            "READ THE FOG RECORD",
            110,
            green,
            "Seven autumn reports disagree with the census.",
          ),
          choice(
            "WATCH THE CLOCK",
            111,
            yellow,
            "The warning band is already moving toward 02:17.",
          ),
          choice(
            endings.length ? "OPEN OLD MORNINGS" : "LIFT THE BATTERY COVER",
            endings.length ? 899 : 101,
            cyan,
            endings.length
              ? "The receiver kept the mornings you already saw."
              : "A folded receiver card is taped underneath.",
            { kind: "return" },
          ),
        ],
        effect: "idle",
      };

    case 101:
      return {
        page,
        section: "RECEIVER MANUAL",
        title: "USING NIGHT PAGES",
        objective: "THE SET ANSWERS TO COLOUR AND NUMBER.",
        prompt: "RETURN TO THE BROADCAST WHEN READY.",
        body: [
          "BELLWETHER MODEL 214 / RECEIVER CARD",
          "",
          "A COLOURED LINE TURNS TO ITS PAGE.",
          "YOU MAY ALSO ENTER THREE DIGITS.",
          "",
          "WHEN A PAGE ASKS FOR YOUR WORD:",
          "FIRST PRESS SHOWS WHAT WILL FOLLOW.",
          "SECOND PRESS SENDS IT.",
          "",
          "SOME NUMBERS ARE BURIED IN RECORDS.",
          "THEY ARE ALWAYS PRINTED SOMEWHERE.",
          "",
          "P151 IS THE SET'S CARBON COPY.",
          "P160 IS RESERVED FOR THE LAST WORD.",
        ],
        choices: [
          choice(
            "OPEN MARA'S FILE",
            120,
            red,
            "Begin with the police carbon.",
          ),
          choice(
            "READ THE FOG RECORD",
            110,
            green,
            "Begin with seven autumn corrections.",
          ),
          choice(
            "READ THE SET'S CARBON",
            151,
            yellow,
            "See what the receiver has retained.",
            { kind: "return" },
          ),
          choice(
            "RETURN TO THE NIGHT INDEX",
            100,
            cyan,
            "Return to the interrupted forecast.",
            { kind: "return" },
          ),
        ],
        effect: "idle",
      };

    case 110:
      return {
        page,
        section: "WEATHER ARCHIVE",
        title: "ONE NAME FOR ONE MORNING",
        objective: "THE FOG HAS KEPT THIS APPOINTMENT.",
        prompt: "WHICH RECORD DO YOU BELIEVE?",
        body: [
          "SEVEN OCTOBERS AGO, THE FOG",
          "STOPPED AT BELLWETHER'S FIRST HOUSE.",
          "",
          "BY MORNING, MAYOR PIKE HAD SIGNED",
          "A PRIVATE ORDER WITH THE WEATHER DESK:",
          "",
          "ONE NAME AT 02:17.",
          "ONE NAME, AND THE REST WAKE SAFELY.",
          "",
          "AFTER EACH SIREN, A CHAIR STOOD EMPTY.",
          "THE TOWN LEARNED NOT TO COUNT.",
          "",
          "MARA VENN COUNTED.",
          "TONIGHT THE DESK IS PRINTING HERS.",
        ],
        choices: [
          choice(
            "OPEN MARA'S FILE",
            120,
            red,
            "Her police carbon is still warm.",
          ),
          choice(
            "COUNT THE EMPTY HOUSES",
            122,
            green,
            "Each siren is followed by one correction.",
          ),
          choice(
            "READ THE COUNCIL CARBON",
            130,
            yellow,
            "Mara marked four entries in red pencil.",
          ),
        ],
        effect: "fog",
      };

    case 111:
      return {
        page,
        section: "LIVE WEATHER",
        title: "FOUR MINUTES LEFT",
        objective: "THE WARNING BAND CLOSES AT 02:17.",
        prompt: "WHICH SIGNAL DO YOU FOLLOW?",
        body: [
          "RESERVOIR ROAD ....... NO VISIBILITY",
          "HILL RELAY ........... CARRIER OPEN",
          "WARNING BAND ......... NAME PRESENT",
          "",
          "CURRENT ENTRY: MARA VENN",
          "LEGIBILITY: FALLING",
          "",
          "THE CARRIER CLOSES WHEN THE SIREN ENDS.",
          "ONE LINE MAY STILL REPLACE THE NAME.",
          "",
          "A LIVE TEXT CHANNEL KEEPS OPENING",
          "AND CLOSING ON PAGE 150.",
        ],
        choices: [
          choice(
            "FOLLOW MARA VENN",
            120,
            red,
            "The name leads back to a police carbon.",
          ),
          choice(
            "READ HER MARKED PAGES",
            130,
            green,
            "Red pencil interrupts the weather copy.",
          ),
          choice(
            "ANSWER THE WOMAN",
            150,
            yellow,
            "The live line signs itself M.V.",
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
        objective: "THE PAPER REMEMBERS LESS EACH MINUTE.",
        prompt: "WHAT DID MARA LEAVE BEHIND?",
        body: [
          "AGE 19 / NIGHT TELETEXT EDITOR",
          "LAST SEEN: HILL RELAY / 02:17",
          "AMBER SCARF RECOVERED: NO",
          "",
          "HER FINAL CALL WAS TRANSCRIBED:",
          "",
          "\"PIKE SENDS THEM A NAME.",
          "I PUT THE COPIES WHERE TV LIGHT LIVES.\"",
          "",
          "THE CASE WAS CLOSED BEFORE DAWN.",
          "BY BREAKFAST, HER DESK WAS EMPTY.",
          "BY NOON, NO OFFICER KNEW THE FILE.",
          "",
          "ONLY THE CARBON STILL SPELLS VENN.",
        ],
        choices: [
          choice(
            "FOLLOW THE FADING FILE",
            121,
            red,
            "Two paper records still remember her.",
          ),
          choice(
            "READ MARA'S PENCIL MARKS",
            130,
            green,
            "Her red-pencil page was filed as weather.",
          ),
          choice(
            "ANSWER THE LIVE LINE",
            150,
            yellow,
            "A teletype channel keeps spelling M.V.",
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
        objective: "THE BLANK SPACE IS STILL GROWING.",
        prompt: "WHICH PAPER DO YOU TRUST?",
        body: [
          "FILE 88-10-13",
          "NAME: M- -  V- - -",
          "AGE: 19 / NIGHT TEXT EDITOR",
          "",
          "THE FILE LOSES ANOTHER LETTER.",
          "TWO PAPER RECORDS STILL NAME HER:",
          "",
          "SCHOOL REGISTER ........ PAGE 131",
          "LEA'S UNSENT LETTER .... PAGE 140",
          "",
          "SOMEONE HAS DRAWN A BOX AROUND 131.",
          "AN AMBER THREAD IS CAUGHT IN THE STAPLE.",
        ],
        choices: [
          choice(
            "OPEN THE SCHOOL REGISTER",
            131,
            red,
            "Mara's class photograph is still developing.",
          ),
          choice(
            "READ LEA'S LETTER",
            140,
            green,
            "The envelope was never delivered.",
          ),
          choice(
            "READ MARA'S PENCIL MARKS",
            130,
            yellow,
            "Her handwriting continues on another page.",
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
        title: "SEVEN QUIET CORRECTIONS",
        objective: "THE CENSUS LOSES ONE AFTER EACH SIREN.",
        prompt: "WHICH COPY DO YOU OPEN?",
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
          "ONE WEATHER ORDER PRECEDES EACH LOSS.",
          "NO NAME SURVIVES THE CORRECTION.",
        ],
        choices: [
          choice(
            "OPEN THE ENGINEER'S LOG",
            132,
            red,
            "Seven years share the same carrier time.",
          ),
          choice(
            "READ THE COUNCIL CARBON",
            130,
            green,
            "Pike's initials repeat in the margins.",
          ),
          choice(
            "READ THE LAST FORECAST",
            133,
            yellow,
            "The final weather tape ends on three eights.",
          ),
        ],
        effect: "relay",
      };

    case 130:
      return {
        page,
        section: "NIGHT EDITOR'S DESK",
        title: "MARA'S RED-PENCIL PAGE",
        objective: "FOUR MARKS SURVIVED THE ERASURE.",
        prompt: "WHICH MARK DO YOU FOLLOW?",
        body: [
          "A SHEET IS PINNED BELOW THE FORECAST.",
          "THE PAPER IS WET. THE INK IS NOT.",
          "",
          "A GIRL'S NAME ................. P131",
          "SEVEN EMPTY CHAIRS ............ P132",
          "PIKE'S HAND ON THE ORDER ....... P141",
          "A FACE IN BLACK GLASS .......... P133",
          "",
          "BESIDE PIKE, MARA WROTE: 617.",
          "BESIDE THE FACE: \"LAST FORECAST.\"",
          "",
          "AT THE BOTTOM:",
          "\"DO NOT LET THEM CALL IT WEATHER.\"",
        ],
        choices: [
          choice(
            "FOLLOW THE GIRL'S NAME",
            131,
            red,
            "The school register is still public.",
          ),
          choice(
            "COUNT THE EMPTY CHAIRS",
            132,
            green,
            "The relay log repeats one absence seven times.",
          ),
          choice(
            "TUNE THE COUNCIL TAPE",
            617,
            yellow,
            "The number 617 is pressed hard into the paper.",
          ),
          choice(
            "READ THE LAST FORECAST",
            133,
            cyan,
            "Three eights keep appearing in the weather tape.",
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
        objective: "ONE LINE STILL HOLDS HER WHOLE NAME.",
        prompt: "WHAT DO YOU WRITE IN THE REGISTER?",
        body: [
          "BELLWETHER SCHOOL / CLASS OF 1986",
          "",
          "LEA VENN",
          "MARA VENN ................. [FADING]",
          "",
          "UNDER MARA'S PHOTOGRAPH:",
          "\"WRITE MY NAME WHERE LIGHT CAN SEE.\"",
          "",
          "THE INK IS WET BENEATH YOUR FINGER.",
          "THE REST OF THE PAGE IS FORTY YEARS OLD.",
          "",
          "WHATEVER YOU WRITE WILL HOLD UNTIL DAWN.",
        ],
        choices: [
          choice(
            "WRITE MARA VENN",
            134,
            red,
            "Her name remains in the signal. The fog may still ask for another.",
            {
              kind: "decision",
              set: { rememberedMara: true },
            },
          ),
          choice(
            "LEAVE THE LINE BLANK",
            135,
            green,
            "The register goes white. No later page can restore her name tonight.",
            {
              kind: "decision",
              set: { forgotMara: true },
            },
          ),
          choice(
            "READ LEA'S LETTER",
            140,
            yellow,
            "Her sister wrote the name one last time.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            cyan,
            "Leave the ink untouched for now.",
            { kind: "return" },
          ),
        ],
        effect: "scarf",
      };

    case 134:
      return {
        page,
        section: "THE REGISTER HOLDS",
        title: "MARA VENN / STILL PRESENT",
        objective: "THE LETTERS HAVE STOPPED FLICKERING.",
        prompt: "WHAT MOVES IN THE ROOM?",
        body: [
          "YOU TYPE: MARA VENN.",
          "",
          "THE LETTERS STOP FLICKERING.",
          "HER PHOTOGRAPH DEVELOPS A FACE.",
          "AN AMBER SCARF APPEARS ON YOUR CHAIR.",
          "",
          "ON THE REVERSE, A NEW LINE APPEARS:",
          "\"A NAME CAN CALL ONE BODY HOME.",
          "THE FOG WILL STILL ASK FOR BALANCE.\"",
          "",
          "LEA VENN / UNSENT LETTER / P140",
        ],
        choices: [
          choice(
            "OPEN LEA'S LETTER",
            140,
            red,
            "The envelope opens at Mara's name.",
          ),
          choice(
            "COUNT THE EMPTY CHAIRS",
            132,
            green,
            "The same carrier time appears seven times.",
          ),
          choice(
            "ANSWER MARA",
            150,
            yellow,
            "A live line is typing beneath the register.",
          ),
        ],
        effect: "scarf",
        soundCaption: "[THE AMBER SCARF SETTLES ON YOUR CHAIR]",
      };

    case 135:
      return {
        page,
        section: "THE EMPTY LINE",
        title: "THE REGISTER CLOSES",
        objective: "THE PHOTOGRAPH NO LONGER HAS A NAME.",
        prompt: "WHAT REMAINS AFTER THE NAME?",
        body: [
          "YOU LEAVE THE LINE BLANK.",
          "",
          "MARA'S PHOTOGRAPH TURNS PALE.",
          "THE LAST TWO LETTERS OF VENN VANISH.",
          "THE CORRIDOR FIGURE STEPS BACK.",
          "",
          "THE BLANK LINE SPREADS THROUGH THE",
          "INDEX AT THE BACK OF THE BOOK.",
          "",
          "NO MORNING CAN CALL HER HOME BY A NAME",
          "THE PAPER HAS LOST.",
        ],
        choices: [
          choice(
            "RETURN TO MARA'S DESK",
            130,
            red,
            "Her other pencil marks remain.",
          ),
          choice(
            "ANSWER MARA",
            150,
            green,
            "The live line has seen the blank space.",
          ),
          choice(
            "READ THE LAST FORECAST",
            133,
            yellow,
            "A camera still points into the room.",
          ),
        ],
        effect: "ending-dark",
      };

    case 132:
      if (flags.markedPattern || flags.dismissedPattern) {
        return {
          page,
          section: flags.markedPattern ? "RED RINGS" : "CORRECTED COPY",
          title: flags.markedPattern
            ? "THE DATES WILL NOT COME CLEAN"
            : "SEVEN ACCEPTABLE ERRORS",
          objective: flags.markedPattern
            ? "RED INK NOW JOINS ALL SEVEN YEARS."
            : "THE SEVEN YEARS HAVE GONE PALE.",
          prompt: "WHAT SURVIVED IN MARA'S HAND?",
          body: [
            flags.markedPattern
              ? "YOU DRAW ONE RED RING THROUGH"
              : "YOU FILE EACH ABSENCE AS",
            flags.markedPattern
              ? "ALL SEVEN CARRIER TIMES."
              : "A SEPARATE PRINT ERROR.",
            "",
            flags.markedPattern
              ? "THE INK BLEEDS THROUGH EVERY COPY."
              : "THE CARBON PAPER TURNS ALMOST WHITE.",
            "",
            "MARA'S HANDWRITING REMAINS BELOW:",
            "\"COUNCIL RECORDING / PAGE 617\"",
            "",
            "BENEATH IT: \"PIKE KEPT THE ORIGINAL.\"",
          ],
          choices: [
            choice(
              "LISTEN AT 617",
              617,
              red,
              "The council voice is still on the carrier.",
            ),
            choice(
              "READ THE LAST FORECAST",
              133,
              green,
              "Three eights survive the damaged tape.",
            ),
            choice(
              "ANSWER MARA",
              150,
              yellow,
              "The live line is waiting beneath the log.",
            ),
          ],
          effect: "relay",
        };
      }
      return {
        page,
        section: "HILL RELAY",
        title: "THE SEVEN OCTOBERS",
        objective: "THE SAME ABSENCE REPEATS SEVEN TIMES.",
        prompt: "WHICH DATES DO YOU CIRCLE?",
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
          "MARA WROTE: \"COUNCIL TAPE / P617\"",
          "",
          "THE RED PENCIL WILL NOT ERASE BEFORE",
          "THE CARRIER CLOSES.",
        ],
        choices: [
          choice(
            "RING ALL SEVEN DATES",
            132,
            red,
            "The seven absences remain joined in the carbon.",
            {
              kind: "decision",
              set: { markedPattern: true },
            },
          ),
          choice(
            "FILE THEM AS PRINT ERRORS",
            132,
            green,
            "The seven absences separate and fade.",
            {
              kind: "decision",
              set: { dismissedPattern: true },
            },
          ),
          choice(
            "LISTEN AT 617",
            617,
            yellow,
            "Leave the dates untouched and hear the council tape.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            cyan,
            "Leave the red pencil where it lies.",
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
        title: "THE WEATHER LOOKS BACK",
        objective: "THREE EIGHTS REMAIN WHEN THE TAPE ENDS.",
        prompt: "WHAT IS THE CAMERA POINTING AT?",
        body: [
          "MARA'S LAST FORECAST / 02:16:58",
          "",
          "PRESSURE ............. 888 MB",
          "HUMIDITY ............. 88%",
          "VISIBILITY ........... 8 METRES",
          "FORECAST ............. REPEATING",
          "",
          "MARA'S NOTE:",
          "\"ROOM 214 IS NOT IN 1988.",
          "CEDAR COURT WAS DEMOLISHED IN 1991.",
          "",
          "WHEN THE SCREEN GOES BLACK,",
          "SOMEONE IS STILL SITTING THERE.",
          "MIRROR CAMERA / PAGE 888.\"",
        ],
        choices: [
          choice(
            "OPEN THE MIRROR AT 888",
            888,
            red,
            "The feed points toward the chair in front of the set.",
          ),
          choice(
            "ANSWER MARA",
            150,
            green,
            "Ask the live line who is sitting there.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            yellow,
            "Leave the black glass dark for now.",
            { kind: "return" },
          ),
        ],
        hidden: ["REVEAL: 888 IS WRITTEN BACKWARDS IN THE BLACK GLASS."],
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
        title: "THE LAST LINE IS EMPTY",
        objective: "LEA LEFT THE LAST LINE FOR YOU.",
        prompt: "WHAT DO YOU WRITE BENEATH LEA?",
        body: [
          "LEA VENN / 12 OCT 1988",
          "",
          "\"MARA, IF THIS PAGE SURVIVES, THEY",
          "CHOSE YOU. I PROMISED TO SAY YOUR",
          "NAME UNTIL SOMEONE REMEMBERED IT.",
          "",
          "SHE ALWAYS CAME HOME WHEN I LEFT",
          "THE PORCH LIGHT ON. IT IS ON NOW.",
          "",
          "VIEWER: IF SHE CANNOT HEAR ME,",
          "CARRY THIS THE REST OF THE WAY.",
          "",
          "LEA\"",
        ],
        choices: [
          choice(
            "CARRY LEA'S WORD",
            142,
            red,
            "Your promise gives Mara a way home, if her name still survives.",
            {
              kind: "decision",
              set: { madePromise: true },
            },
          ),
          choice(
            "FOLD THE LETTER SHUT",
            143,
            green,
            "Lea's promise ends here. Mara cannot be called home by name.",
            {
              kind: "decision",
              set: { refusedPromise: true },
            },
          ),
          choice(
            "READ MARA'S PENCIL MARKS",
            130,
            yellow,
            "Leave the last line empty for now.",
          ),
          choice(
            "RETURN TO MARA'S FILE",
            121,
            cyan,
            "Return the letter to the fading file.",
            { kind: "return" },
          ),
        ],
        effect: "letter",
        soundCaption: "[PAPER FOLDS ITSELF ON THE TABLE]",
      };

    case 142:
      return {
        page,
        section: "THE LETTER OPENS",
        title: "YOUR NAME BENEATH LEA'S",
        objective: "THE PAPER HAS PRINTED A SECOND COPY.",
        prompt: "WHERE DOES THE COPY GO?",
        body: [
          "YOU TYPE: I WILL SAY HER NAME.",
          "",
          "LEA'S LETTER PRINTS A SECOND COPY.",
          "THE PAPER ON YOUR TABLE UNFOLDS.",
          "",
          "BENEATH LEA'S SIGNATURE:",
          "\"THE PORCH LIGHT IS STILL ON.\"",
          "",
          "ONE PROMISE CAN GUIDE ONE PERSON HOME.",
          "THE FOG NEVER PROMISED TO RETURN",
          "EMPTY-HANDED.",
        ],
        choices: [
          choice(
            "FOLLOW MARA'S NAME",
            131,
            red,
            "A promise needs a name to find.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            green,
            "Place the second copy beneath her red pencil.",
          ),
          choice(
            "ANSWER MARA",
            150,
            yellow,
            "Tell the live line that Lea's porch light is on.",
          ),
        ],
        effect: "letter",
      };

    case 143:
      return {
        page,
        section: "THE LETTER FOLDS",
        title: "NO SECOND SIGNATURE",
        objective: "LEA'S LAST LINE HAS CLOSED ITSELF.",
        prompt: "WHAT DOES THE FOLDED PAPER TOUCH?",
        body: [
          "YOU TYPE: I CANNOT PROMISE THAT.",
          "",
          "LEA'S LETTER FOLDS INTO A SMALLER",
          "RECTANGLE. HER SIGNATURE DISAPPEARS.",
          "",
          "THE PORCH LIGHT IN LEA'S SENTENCE",
          "GOES OUT ONE LETTER AT A TIME.",
          "",
          "THE ROOM KEEPS THE FOLDED RECTANGLE",
          "BENEATH THE TELEPHONE.",
        ],
        choices: [
          choice(
            "RETURN TO MARA'S DESK",
            130,
            red,
            "Other red-pencil marks remain.",
          ),
          choice(
            "ANSWER MARA",
            150,
            green,
            "The live line heard the letter fold.",
          ),
          choice(
            "READ THE LAST FORECAST",
            133,
            yellow,
            "The black glass may still accept another name.",
          ),
        ],
        effect: "letter",
      };

    case 141:
      if (!flags.foundKey) {
        return {
          page,
          section: "SEALED STATEMENT",
          title: "PIKE / ACCESS 617",
          objective: "A COUNCIL VOICE HOLDS THE KEY.",
          prompt: "WHERE DID MARA HIDE THE NUMBER?",
          body: [
            "AUTHENTICATION REQUIRED.",
            "",
            "THE SEAL CARRIES THREE SHALLOW DENTS:",
            "6 / 1 / 7",
            "",
            "MARA WROTE THE SAME NUMBER",
            "BESIDE THE COUNCIL RECORDING.",
            "",
            "A MAN'S VOICE REPEATS BEHIND P617.",
          ],
          choices: [
            choice(
              "LISTEN AT 617",
              617,
              red,
              "The tape may speak the seal open.",
            ),
            choice(
              "RETURN TO MARA'S DESK",
              130,
              green,
              "The number is written beside Pike's name.",
              { kind: "return" },
            ),
            choice(
              "RETURN TO THE SEVEN DATES",
              132,
              yellow,
              "Mara wrote 617 beneath the carrier times.",
            ),
          ],
          effect: "sealed",
        };
      }
      if (flags.keptConfession || flags.destroyedConfession) {
        return {
          page,
          section: flags.keptConfession
            ? "PIKE'S SIGNATURE"
            : "STATIC OVER PIKE",
          title: flags.keptConfession
            ? "THE ORIGINAL REMAINS"
            : "THE ORIGINAL IS WHITE NOISE",
          objective: flags.keptConfession
            ? "THE MAYOR'S NAME BLEEDS THROUGH CARBON."
            : "THE MAYOR'S NAME HAS BURNED AWAY.",
          prompt: "WHAT ANSWERS THE STATIC?",
          body: [
            flags.keptConfession
              ? "YOU COPY PIKE'S SIGNATURE."
              : "YOU FEED PIKE'S SIGNATURE TO STATIC.",
            "",
            flags.keptConfession
              ? "THE MAYOR'S HAND REMAINS VISIBLE"
              : "THE MAYOR'S HAND DISAPPEARS",
            flags.keptConfession
              ? "ON EVERY SHEET BENEATH IT."
              : "FROM EVERY SHEET BENEATH IT.",
            "",
            flags.keptConfession
              ? "THE CARBON STAINS YOUR FINGERS RED."
              : "THE SET SMELLS OF HOT PAPER.",
            "",
            "MARA'S LIVE LINE IS STILL OPEN.",
          ],
          choices: [
            choice(
              "ANSWER MARA",
              150,
              red,
              "The live line has heard the paper change.",
            ),
            choice(
              "READ THE LAST FORECAST",
              133,
              green,
              "The black glass remembers what paper cannot.",
            ),
            choice(
              "RETURN TO MARA'S DESK",
              130,
              yellow,
              "Leave the changed order beneath the forecast.",
              { kind: "return" },
            ),
          ],
          effect: "sealed",
        };
      }
      return {
        page,
        section: "MAYOR'S STATEMENT",
        title: "THE SIGNATURE AT THE BOTTOM",
        objective: "PIKE NAMES EVERYONE EXCEPT THE LOST.",
        prompt: "WHAT DO YOU DO WITH THE ORIGINAL?",
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
          "MARA: IF THIS ORDER STAYS PUBLIC,",
          "THE FOG CANNOT CALL IT WEATHER.\"",
          "",
          "PIKE'S INK IS STILL WET.",
        ],
        choices: [
          choice(
            "COPY PIKE'S SIGNATURE",
            141,
            red,
            "The mayor's hand remains in every copy of the order.",
            {
              kind: "decision",
              set: { keptConfession: true },
            },
          ),
          choice(
            "FEED THE ORDER TO STATIC",
            141,
            green,
            "The mayor's hand vanishes from the signal tonight.",
            {
              kind: "decision",
              set: { destroyedConfession: true },
            },
          ),
          choice(
            "ANSWER MARA",
            150,
            yellow,
            "Leave the wet signature untouched and open the live line.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            cyan,
            "Place the sealed order beneath her red pencil.",
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
        title: "THE WOMAN IN THE SIGNAL",
        objective: "THE VOICE KNOWS WHAT IS BEHIND YOU.",
        prompt: "DO YOU BELIEVE THE VOICE IS MARA?",
        body: [
          "MARA: THE FOG TOOK MY BODY.",
          "IT MISSED MY VOICE IN THE CARRIER.",
          "",
          "PRINT MY NAME, I COME BACK.",
          "THE FOG TURNS TOWARD SOMEONE ELSE.",
          "",
          "ANSWER FOR ME, AND IT KEEPS THE ANSWER.",
          "MAKE THE TOWN SEE EVERY PAGE AT ONCE,",
          "AND IT MAY HAVE NOWHERE LEFT TO HIDE ME.",
          "",
          "YOU ARE OUTSIDE THEIR MEMORY.",
          "I CANNOT PROVE THIS VOICE IS STILL MINE.",
        ],
        choices: [
          choice(
            "BELIEVE THE VOICE",
            152,
            red,
            "The signal keeps Mara's face and accepts that the voice is hers.",
            {
              kind: "decision",
              set: { heardMara: true, acceptedMara: true },
            },
          ),
          choice(
            "CLOSE THE LIVE LINE",
            153,
            green,
            "The voice loses Mara's face and cannot speak for her again tonight.",
            {
              kind: "decision",
              set: { heardMara: true, rejectedMara: true },
            },
          ),
          choice(
            "ASK THE MIRROR FOR PROOF",
            133,
            yellow,
            "Leave the voice unanswered and follow its camera to P888.",
            { set: { heardMara: true } },
          ),
          choice(
            "LET THE LINE WAIT",
            130,
            cyan,
            "Return to Mara's red-pencil page without answering.",
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
        section: "THE VOICE HAS A FACE",
        title: "MARA LOOKS UP",
        objective: "THE CORRIDOR FIGURE HAS MARA'S FACE.",
        prompt: "WHERE DOES MARA LOOK NEXT?",
        body: [
          "YOU TYPE: I BELIEVE YOU ARE MARA VENN.",
          "",
          "THE WOMAN IN THE CORRIDOR LOOKS UP.",
          "HER FACE MATCHES THE SCHOOL REGISTER.",
          "",
          "SHE LOOKS PAST THE GLASS TOWARD YOU.",
          "\"THE CAMERA ON P888 CAN SEE THE CHAIR.",
          "ONLY YOU CAN DECIDE IF IT STAYS.\"",
          "",
          "ABOVE P160, A RED LAMP FLICKERS ONCE.",
        ],
        choices: [
          choice(
            "LOOK INTO THE MIRROR AT 888",
            888,
            red,
            "Decide whether the camera may keep your face.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            green,
            "Return to the red-pencil page with Mara's voice in mind.",
            { kind: "return" },
          ),
          choice(
            "TURN TO THE RED LAMP",
            160,
            cyan,
            "Wait for the siren and choose one line to send.",
          ),
        ],
        effect: "live",
      };

    case 153:
      return {
        page,
        section: "THE LIVE LINE CLOSES",
        title: "UNVERIFIED",
        objective: "THE CORRIDOR FIGURE HAS LOST ITS FACE.",
        prompt: "WHAT REMAINS ON THE SCREEN?",
        body: [
          "YOU TYPE: I CANNOT KNOW WHO YOU ARE.",
          "",
          "THE LIVE LINE GOES QUIET.",
          "THE CORRIDOR FIGURE LOSES ITS FACE.",
          "",
          "THE WORD MARA IS REPLACED BY:",
          "SOURCE UNVERIFIED.",
          "",
          "TWO LINES ON P160 GO DARK.",
          "THE LINE WITH HER PRINTED NAME REMAINS.",
        ],
        choices: [
          choice(
            "FOLLOW MARA'S NAME",
            131,
            red,
            "The school register may still hold what the voice lost.",
          ),
          choice(
            "OPEN LEA'S LETTER",
            140,
            green,
            "Her sister wrote to the person behind the voice.",
          ),
          choice(
            "TURN TO THE RED LAMP",
            160,
            cyan,
            "Wait for the siren with the live line closed.",
          ),
        ],
        effect: "ending-dark",
      };

    case 151: {
      const coreChoice = firstMissingCoreChoice(flags);
      const commitmentChoice = firstMissingCommitmentChoice(flags);
      const registerMemory = flags.rememberedMara
        ? "MARA'S NAME HOLDS IN THE SCHOOL BOOK."
        : flags.forgotMara
          ? "A WHITE LINE HAS TAKEN MARA'S PLACE."
          : "THE SCHOOL BOOK ON P131 STILL FLICKERS.";
      const autumnMemory = flags.markedPattern
        ? "SEVEN AUTUMNS WEAR THE SAME RED RING."
        : flags.dismissedPattern
          ? "SEVEN AUTUMNS HAVE BEEN FILED AS ERRORS."
          : "SEVEN AUTUMNS WAIT BETWEEN P132'S LINES.";
      const pikeMemory = flags.keptConfession
        ? "PIKE'S SIGNATURE BLEEDS THROUGH THE ROLL."
        : flags.destroyedConfession
          ? "STATIC HAS EATEN PIKE'S SIGNATURE."
          : flags.foundKey
            ? "PIKE'S SEALED ORDER BREATHES ON P141."
            : "A COUNCIL VOICE WHISPERS 617.";
      const glassMemory = flags.becameWitness
        ? "THE BLACK GLASS HAS LEARNED YOUR FACE."
        : flags.deniedWitness
          ? "THE BLACK GLASS KEEPS AN EMPTY CHAIR."
          : "A SECOND CHAIR CREAKS BEHIND P133.";
      const promiseMemory = flags.madePromise
        ? "LEA'S LETTER CARRIES YOUR HANDWRITING."
        : flags.refusedPromise
          ? "LEA'S LETTER HAS FOLDED ITSELF SHUT."
          : "LEA'S UNOPENED LETTER WAITS ON P140.";
      const voiceMemory = flags.acceptedMara
        ? "THE VOICE ON P150 NOW WEARS MARA'S FACE."
        : flags.rejectedMara
          ? "THE VOICE ON P150 HAS LOST ITS FACE."
          : "A TELEPHONE RINGS INSIDE P150.";
      return {
        page,
        section: "ROOM 214 CARBON",
        title: "WHAT THE SET REMEMBERS",
        objective: "EVERY WORD LEAVES A SHADOW HERE.",
        prompt: "WHICH SHADOW DO YOU FOLLOW?",
        body: [
          "THE PAPER ROLL HAS BEEN WRITING",
          "WHILE YOU READ.",
          "",
          "BELLWETHER LOSES ONE NAME EACH FOG.",
          "TONIGHT THE WEATHER DESK PRINTS MARA.",
          "",
          registerMemory,
          autumnMemory,
          "",
          pikeMemory,
          glassMemory,
          "",
          promiseMemory,
          voiceMemory,
          "",
          flags.heardMara
            ? "ABOVE P160, A RED LAMP IS GLOWING."
            : "THE TELEPHONE IS STILL RINGING ON P150.",
        ],
        choices: [
          coreChoice,
          commitmentChoice,
          choice(
            "RETURN TO MARA'S DESK",
            130,
            yellow,
            "Her red-pencil page still lies beneath the forecast.",
            { kind: "return" },
          ),
          flags.heardMara
            ? choice(
                "TURN TO THE RED LAMP",
                160,
                cyan,
                "The siren will accept one line from the set.",
              )
            : choice(
                "ANSWER THE RINGING LINE",
                150,
                cyan,
                "The live text channel is still signing itself M.V.",
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
        title: "WHEN THE SIREN SPEAKS",
        objective: "ONLY ONE LINE CAN LEAVE THE SET.",
        prompt: "FIRST PRESS TO HEAR IT. SECOND TO AIR.",
        body: [
          "THE RED LAMP COMES ON AT 02:17.",
          "OUTSIDE, EVERY PORCH LIGHT DIES.",
          "",
          "MARA: \"WHATEVER YOU SEND,",
          "BELLWETHER WILL CALL IT MORNING.\"",
          "",
          "FOUR LINES WAIT IN THE CARRIER:",
          "",
          "ONE LEAVES HER TO THE FOG.",
          "ONE WRITES HER BACK AT SOMEONE'S COST.",
          "ONE ANSWERS WITH THE VIEWER'S NAME.",
          "ONE OPENS EVERY SECRET IN THE TOWN.",
          "",
          "THE SIREN TAKES A BREATH.",
        ],
        choices: [
          choice(
            "LET THE FORECAST STAND",
            200,
            red,
            "The fog keeps Mara's name. Bellwether wakes unchanged.",
            {
              kind: "ending",
              ending: "quiet-morning",
            },
          ),
          choice(
            "WRITE MARA BACK IN",
            201,
            green,
            "Mara returns. The old agreement reaches for another name.",
            {
              kind: "ending",
              requires: PAGE_REQUIREMENTS[201],
              lockedMessage: rescueClosedBy.length
                ? `THE GREEN LINE WENT DARK AFTER: ${rescueClosedBy.join(", ")}.`
                : "THE GREEN LINE CANNOT FIND BOTH P131 AND P140.",
              ending: "borrowed-dawn",
            },
          ),
          choice(
            "ANSWER FROM ROOM 214",
            202,
            yellow,
            "Mara returns. Your voice remains inside the set.",
            {
              kind: "ending",
              requires: PAGE_REQUIREMENTS[202],
              lockedMessage: exchangeClosedBy.length
                ? `THE YELLOW LINE WENT DARK AFTER: ${exchangeClosedBy.join(", ")}.`
                : "THE MIRROR DOES NOT HOLD BOTH P150 AND P888.",
              ending: "night-editor",
            },
          ),
          choice(
            "OPEN EVERY CHANNEL",
            203,
            cyan,
            "The town hears the name, dates, order, and witness together.",
            {
              kind: "ending",
              requires: PAGE_REQUIREMENTS[203],
              lockedMessage: closedBy.length
                ? `THE CYAN LINE WENT DARK AFTER: ${closedBy[0]}.`
                : missing.length
                  ? `THE CYAN LINE BREAKS AT P${missing[0]}. P151 HOLDS THE REST.`
                  : "ONE PART OF THE TRANSMISSION IS DARK.",
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
        objective: "AT DAWN, EVEN THE INK IS BLANK.",
        prompt: "THE SET KEEPS THIS MORNING:",
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
            "RETURN TO 02:13",
            120,
            red,
            "The receiver will keep this morning in its archive.",
            { kind: "return", restart: true },
          ),
          choice(
            "OPEN MORNING REPORTS",
            899,
            green,
            "Read the dawns the set has retained.",
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
        objective: "ANOTHER HOUSE WAKES ONE ROOM SHORT.",
        prompt: "THE SET KEEPS THIS MORNING:",
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
            "RETURN TO 02:13",
            120,
            red,
            "The receiver will keep this borrowed dawn.",
            { kind: "return", restart: true },
          ),
          choice(
            "OPEN MORNING REPORTS",
            899,
            green,
            "Read the dawns the set has retained.",
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
        objective: "THE NIGHT DESK HAS A NEW EDITOR.",
        prompt: "THE SET KEEPS THIS MORNING:",
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
            "RETURN TO 02:13",
            120,
            red,
            "The receiver will remember who stayed behind.",
            { kind: "return", restart: true },
          ),
          choice(
            "OPEN MORNING REPORTS",
            899,
            green,
            "Read the dawns the set has retained.",
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
        objective: "BELLWETHER REMEMBERS ALL 2,441.",
        prompt: "THE SET KEEPS THIS MORNING:",
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
            "RETURN TO 02:13",
            120,
            red,
            "The receiver will keep the morning no one vanished.",
            { kind: "return", restart: true },
          ),
          choice(
            "OPEN MORNING REPORTS",
            899,
            green,
            "Read the dawns the set has retained.",
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
        objective: "PIKE'S VOICE HAS OPENED THE SEAL.",
        prompt: "THE ORIGINAL WAITS ON P141:",
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
            "READ PIKE'S ORIGINAL",
            141,
            red,
            "The signature is wet beneath the broken seal.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            green,
            "Leave the council voice repeating at 617.",
            { kind: "return" },
          ),
          choice(
            "ANSWER MARA",
            150,
            yellow,
            "Ask the live line why Pike was afraid of a viewer.",
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
          section: flags.becameWitness
            ? "THE MIRROR HOLDS"
            : "THE EMPTY CHAIR",
          title: flags.becameWitness
            ? "YOUR FACE REMAINS IN THE GLASS"
            : "THE CAMERA FACES THE WALL",
          objective: flags.becameWitness
            ? "THE FEED NOW HAS A NAMELESS WITNESS."
            : "ROOM 214 HAS NO WITNESS.",
          prompt: "WHAT MOVES BEYOND THE CAMERA?",
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
              ? "THE CAMERA PRINTS ONE FRAME"
              : "THE CAMERA PRINTS A BLACK FRAME",
            flags.becameWitness
              ? "AND FEEDS IT BACK INTO THE SET."
              : "AND THEN STOPS FEEDING.",
            "",
            "MARA'S LIVE LINE REMAINS OPEN.",
          ],
          choices: [
            choice(
              "ANSWER MARA",
              150,
              red,
              "The live line saw what the mirror kept.",
            ),
            choice(
              "RETURN TO MARA'S DESK",
              130,
              green,
              "Place the mirror frame beneath her red pencil.",
              { kind: "return" },
            ),
            choice(
              "TURN TO THE RED LAMP",
              160,
              cyan,
              "The siren will accept one line after Mara speaks.",
              {
                requires: ["heardMara"],
                lockedMessage: "THE LIVE LINE ON P150 HAS NOT SPOKEN YET.",
              },
            ),
          ],
          effect: "mirror",
        };
      }
      return {
        page,
        section: "MIRROR CAMERA",
        title: "ROOM 214 / LIVE",
        objective: "THE CAMERA IS POINTED AT YOUR CHAIR.",
        prompt: "DO YOU LET THE GLASS KEEP YOUR FACE?",
        body: [
          "CEDAR COURT WAS DEMOLISHED IN 1991.",
          "THE FEED IS DATED 13 OCT 1988.",
          "",
          "THE CAMERA SHOWS YOUR CHAIR.",
          "DELAY: 00:00:00",
          "NAME FIELD: BLANK",
          "",
          "MARA: \"THEY CANNOT ERASE SOMEONE",
          "THE TOWN NEVER RECORDED.",
          "",
          "IF THE GLASS KEEPS YOUR FACE,",
          "IT CAN REMEMBER FOR THEM.",
          "IT CAN ALSO ANSWER FOR ME.\"",
        ],
        choices: [
          choice(
            "STEP INTO THE MIRROR",
            888,
            red,
            "Your face enters the town's record and may answer the final signal.",
            {
              kind: "decision",
              set: { becameWitness: true },
            },
          ),
          choice(
            "TURN THE CAMERA TO THE WALL",
            888,
            green,
            "Your face stays outside. The signal cannot answer with you tonight.",
            {
              kind: "decision",
              set: { deniedWitness: true },
            },
          ),
          choice(
            "ANSWER MARA",
            150,
            yellow,
            "Leave the camera running and ask the live line.",
          ),
          choice(
            "RETURN TO MARA'S DESK",
            130,
            cyan,
            "Leave the camera pointed at the empty chair.",
            { kind: "return" },
          ),
        ],
        effect: "mirror",
        soundCaption: "[A SECOND CHAIR CREAKS IN THE GLASS]",
      };

    case 899:
      return {
        page,
        section: "MORNING REPORTS",
        title: "THE DAWNS INSIDE THE SET",
        objective: "SOME MORNINGS RETURN AS STATIC.",
        prompt: "WHICH PAGE DO YOU OPEN AGAIN?",
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
          `${endings.length}/4 MORNINGS RETAINED`,
          "",
          "ON ANOTHER NIGHT, P151 WILL KEEP",
          "THE MARKS YOU LEAVE IN THE CARBON.",
        ],
        choices: [
          choice(
            "OPEN MARA'S FILE AGAIN",
            120,
            red,
            "The police carbon will begin fading from the top.",
            { kind: "return", restart: true },
          ),
          choice(
            "OPEN A FRESH CARBON",
            151,
            green,
            "The set will begin writing a new night.",
            { kind: "return", restart: true },
          ),
          choice(
            "READ VIEWER NOTES",
            101,
            yellow,
            "Read the instructions beneath the battery cover.",
            { kind: "return", restart: true },
          ),
          choice(
            "RETURN TO THE NIGHT INDEX",
            100,
            cyan,
            "Let the receiver find 02:13 again.",
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
