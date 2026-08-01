"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NightAudio } from "./audio";
import { TeletextScene } from "./scene-controller";
import {
  ENDING_LABELS,
  getStoryPage,
  INITIAL_FLAGS,
  PAGE_REQUIREMENTS,
  requirementsMet,
  type EndingId,
  type StoryFlags,
} from "./story";

const PAGE_ENDINGS: Partial<Record<number, EndingId>> = {
  200: "quiet-morning",
  201: "borrowed-dawn",
  202: "night-editor",
  203: "no-one-missing",
};

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"];

function readStoredEndings(): EndingId[] {
  try {
    const value = JSON.parse(
      window.localStorage.getItem("night-index-endings") ?? "[]",
    ) as string[];
    return value.filter((ending): ending is EndingId =>
      Object.prototype.hasOwnProperty.call(ENDING_LABELS, ending),
    );
  } catch {
    return [];
  }
}

export function TeletextGame() {
  const hostRef = useRef<HTMLDivElement>(null);
  const remoteTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const remotePanelRef = useRef<HTMLElement>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<TeletextScene | null>(null);
  const audioRef = useRef<NightAudio | null>(null);
  const tuneTimerRef = useRef<number | null>(null);
  const digitTimerRef = useRef<number | null>(null);
  const alertTimerRef = useRef<number | null>(null);
  const captionTimerRef = useRef<number | null>(null);

  const [started, setStarted] = useState(false);
  const [viewerNoticeOpen, setViewerNoticeOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [readyForPage, setReadyForPage] = useState(false);
  const [isTuning, setIsTuning] = useState(false);
  const [currentPageNumber, setCurrentPageNumber] = useState(100);
  const [flags, setFlags] = useState<StoryFlags>({ ...INITIAL_FLAGS });
  const [endings, setEndings] = useState<EndingId[]>([]);
  const [selectedChoice, setSelectedChoice] = useState(-1);
  const [pageEntry, setPageEntry] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [hold, setHold] = useState(false);
  const [focus, setFocus] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundCaptions, setSoundCaptions] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [reducedFlash, setReducedFlash] = useState(false);
  const [status, setStatus] = useState(
    "The receiver is waiting for a signal.",
  );
  const [soundCaption, setSoundCaption] = useState("");

  const flagsRef = useRef(flags);
  const endingsRef = useRef(endings);
  const pageNumberRef = useRef(currentPageNumber);
  const selectedChoiceRef = useRef(selectedChoice);
  const startedRef = useRef(started);
  const isTuningRef = useRef(isTuning);
  const focusRef = useRef(focus);
  const soundEnabledRef = useRef(soundEnabled);
  const soundCaptionsRef = useRef(soundCaptions);
  const pageEntryRef = useRef(pageEntry);
  const revealedRef = useRef(revealed);
  const holdRef = useRef(hold);
  const startingRef = useRef(false);
  const chooseRef = useRef<(index: number) => void>(() => {});
  const tuneRef = useRef<
    (
      page: number,
      nextFlags?: StoryFlags,
      authorized?: boolean,
    ) => void
  >(() => {});

  const currentPage = useMemo(
    () =>
      getStoryPage(currentPageNumber, flags, endings) ??
      getStoryPage(100, flags, endings)!,
    [currentPageNumber, flags, endings],
  );
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    flagsRef.current = flags;
    endingsRef.current = endings;
    pageNumberRef.current = currentPageNumber;
    selectedChoiceRef.current = selectedChoice;
    startedRef.current = started;
    isTuningRef.current = isTuning;
    focusRef.current = focus;
    soundEnabledRef.current = soundEnabled;
    soundCaptionsRef.current = soundCaptions;
    pageEntryRef.current = pageEntry;
    revealedRef.current = revealed;
    holdRef.current = hold;
    currentPageRef.current = currentPage;
  }, [
    currentPage,
    currentPageNumber,
    endings,
    flags,
    focus,
    isTuning,
    hold,
    pageEntry,
    revealed,
    selectedChoice,
    soundCaptions,
    soundEnabled,
    started,
  ]);

  const clearTimer = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  };

  const showCaption = useCallback((caption: string) => {
    clearTimer(captionTimerRef);
    setSoundCaption(caption);
    if (!caption) return;
    captionTimerRef.current = window.setTimeout(() => {
      setSoundCaption("");
    }, 3_600);
  }, []);

  const restoreCurrentPage = useCallback(() => {
    const fallback =
      getStoryPage(
        pageNumberRef.current,
        flagsRef.current,
        endingsRef.current,
      ) ?? getStoryPage(100, flagsRef.current, endingsRef.current)!;
    sceneRef.current?.showPage(fallback, flagsRef.current);
    sceneRef.current?.setSelection(selectedChoiceRef.current);
    sceneRef.current?.setRevealed(revealedRef.current);
    sceneRef.current?.setHold(holdRef.current);
    sceneRef.current?.setFocus(focusRef.current);
  }, []);

  const showUnavailablePage = useCallback(
    (page: number, message = "No carrier found for that page.") => {
      const code = page.toString().padStart(3, "0");
      setIsTuning(true);
      isTuningRef.current = true;
      setStatus(message);
      setPageEntry("");
      sceneRef.current?.setEntry("");
      sceneRef.current?.showSearch(code);
      audioRef.current?.cue("locked");

      clearTimer(tuneTimerRef);
      tuneTimerRef.current = window.setTimeout(() => {
        sceneRef.current?.showMissing(code);
        tuneTimerRef.current = window.setTimeout(() => {
          restoreCurrentPage();
          setIsTuning(false);
          isTuningRef.current = false;
        }, 1_050);
      }, 360);
    },
    [restoreCurrentPage],
  );

  const tuneTo = useCallback(
    (
      targetPage: number,
      requestedFlags = flagsRef.current,
      authorized = false,
    ) => {
      if (isTuningRef.current) return;

      if (!authorized && PAGE_ENDINGS[targetPage]) {
        showUnavailablePage(
          targetPage,
          "Choose and confirm this ending on page 160.",
        );
        return;
      }

      const directRequirements = PAGE_REQUIREMENTS[targetPage];
      if (
        !authorized &&
        directRequirements &&
        !requirementsMet(directRequirements, requestedFlags)
      ) {
        showUnavailablePage(
          targetPage,
          targetPage === 160
            ? "The red lamp stays dark until Mara answers on page 150."
            : "That page has no signal until its preceding choice is made.",
        );
        return;
      }

      const destination = getStoryPage(
        targetPage,
        requestedFlags,
        endingsRef.current,
      );
      if (!destination) {
        showUnavailablePage(targetPage);
        return;
      }

      const nextFlags = destination.visitSets
        ? { ...requestedFlags, ...destination.visitSets }
        : requestedFlags;
      const code = targetPage.toString().padStart(3, "0");
      const reachedEnding = PAGE_ENDINGS[targetPage];

      if (reachedEnding) {
        setEndings((previous) => {
          const next = previous.includes(reachedEnding)
            ? previous
            : [...previous, reachedEnding];
          endingsRef.current = next;
          return next;
        });
      }

      clearTimer(tuneTimerRef);
      clearTimer(digitTimerRef);
      setIsTuning(true);
      isTuningRef.current = true;
      setPageEntry("");
      setRevealed(false);
      setHold(false);
      setSelectedChoice(-1);
      selectedChoiceRef.current = -1;
      sceneRef.current?.setEntry("");
      sceneRef.current?.showSearch(code);
      audioRef.current?.cue("page");
      setStatus(`Searching for page ${code}.`);

      tuneTimerRef.current = window.setTimeout(() => {
        setFlags({ ...nextFlags });
        flagsRef.current = { ...nextFlags };
        setCurrentPageNumber(targetPage);
        pageNumberRef.current = targetPage;
        setStatus(
          destination.objective ?? `${destination.section}, page ${code}.`,
        );
        setIsTuning(false);
        isTuningRef.current = false;
      }, reducedMotion ? 80 : 520);
    },
    [reducedMotion, showUnavailablePage],
  );
  const selectChoice = useCallback((index: number) => {
    if (!startedRef.current) return;
    const page = currentPageRef.current;
    const item = page.choices[index];
    if (!item || isTuningRef.current) return;

    const requiresConfirmation =
      item.kind === "decision" || item.kind === "ending";
    if (requiresConfirmation && selectedChoiceRef.current !== index) {
      const unlocked = requirementsMet(item.requires, flagsRef.current);
      selectedChoiceRef.current = index;
      setSelectedChoice(index);
      sceneRef.current?.setSelection(index);
      setStatus(
        `${item.detail ?? item.label} ${
          unlocked
            ? "Choose it again to commit."
            : item.lockedMessage ?? "The signal is incomplete."
        }`,
      );
      audioRef.current?.cue("relay");
      return;
    }

    if (!requirementsMet(item.requires, flagsRef.current)) {
      const message = item.lockedMessage ?? "The signal breaks before that page.";
      setStatus(message);
      sceneRef.current?.setAlert(message);
      audioRef.current?.cue("locked");
      showCaption("[THE RECEIVER REFUSES THE INSTRUCTION]");
      clearTimer(alertTimerRef);
      alertTimerRef.current = window.setTimeout(() => {
        sceneRef.current?.clearAlert();
      }, 1_650);
      return;
    }

    let nextFlags = item.restart
      ? { ...INITIAL_FLAGS }
      : { ...flagsRef.current, ...(item.set ?? {}) };

    if (item.ending) {
      const ending = item.ending;
      setEndings((previous) => {
        const next = previous.includes(ending)
          ? previous
          : [...previous, ending];
        endingsRef.current = next;
        return next;
      });
      audioRef.current?.cue("ending");
    }

    if (item.restart) {
      setFocus(false);
      focusRef.current = false;
      sceneRef.current?.setFocus(false);
      showCaption("");
    }

    if (item.set) {
      nextFlags = { ...nextFlags, ...item.set };
    }

    tuneRef.current(item.page, nextFlags, true);
  }, [showCaption]);
  useEffect(() => {
    tuneRef.current = tuneTo;
    chooseRef.current = selectChoice;
  }, [selectChoice, tuneTo]);

  const inputDigit = useCallback((digit: string) => {
    if (!startedRef.current || isTuningRef.current) return;
    clearTimer(digitTimerRef);
    const next = `${pageEntryRef.current}${digit}`.slice(-3);
    setPageEntry(next);
    pageEntryRef.current = next;
    sceneRef.current?.setEntry(next);
    setStatus(`Page entry P${next.padEnd(3, "-")}.`);

    if (next.length === 3) {
      digitTimerRef.current = window.setTimeout(() => {
        tuneRef.current(Number(next), flagsRef.current, false);
      }, 280);
    }
  }, []);

  const eraseDigit = useCallback(() => {
    clearTimer(digitTimerRef);
    const next = pageEntryRef.current.slice(0, -1);
    pageEntryRef.current = next;
    setPageEntry(next);
    sceneRef.current?.setEntry(next);
    setStatus(next ? `Page entry P${next.padEnd(3, "-")}.` : "Page entry cleared.");
  }, []);

  const toggleFocus = useCallback(() => {
    if (!startedRef.current) return;
    const next = !focusRef.current;
    focusRef.current = next;
    setFocus(next);
    sceneRef.current?.setFocus(next);
    setStatus(next ? "Teletext focus enabled." : "Room view restored.");
  }, []);

  const toggleReveal = useCallback(() => {
    if (!currentPageRef.current.hidden?.length) {
      setStatus("This page has no concealed clue.");
      audioRef.current?.cue("locked");
      return;
    }
    setRevealed((previous) => {
      const next = !previous;
      revealedRef.current = next;
      sceneRef.current?.setRevealed(next);
      setStatus(next ? "Concealed text revealed." : "Concealed text hidden.");
      audioRef.current?.cue("relay");
      return next;
    });
  }, []);

  const toggleHold = useCallback(() => {
    setHold((previous) => {
      const next = !previous;
      holdRef.current = next;
      sceneRef.current?.setHold(next);
      setStatus(next ? "Page cycle held." : "Page cycle released.");
      return next;
    });
  }, []);

  const beginExperience = useCallback(async () => {
    if (startedRef.current || startingRef.current) return;
    startingRef.current = true;
    const audio = audioRef.current;
    if (audio && soundEnabledRef.current) {
      try {
        await audio.start();
        audio.setEnabled(true);
        audio.cue("relay");
      } catch {
        setSoundEnabled(false);
        soundEnabledRef.current = false;
      }
    }

    startingRef.current = false;
    startedRef.current = true;
    setStarted(true);
    isTuningRef.current = true;
    setIsTuning(true);
    setStatus("Acquiring Bellwether Night Service.");
    sceneRef.current?.begin();
    sceneRef.current?.showSearch("100");

    tuneTimerRef.current = window.setTimeout(() => {
      setReadyForPage(true);
      isTuningRef.current = false;
      setIsTuning(false);
      setStatus("At 02:17, the forecast will choose a name.");
    }, reducedMotion ? 100 : 780);
  }, [reducedMotion]);

  useEffect(() => {
    if (!hostRef.current) return;
    const audio = new NightAudio();
    audioRef.current = audio;
    const scene = new TeletextScene(hostRef.current, {
      onChoice: (index) => chooseRef.current(index),
      onToggleFocus: () => toggleFocus(),
    });
    sceneRef.current = scene;

    return () => {
      clearTimer(tuneTimerRef);
      clearTimer(digitTimerRef);
      clearTimer(alertTimerRef);
      clearTimer(captionTimerRef);
      scene.dispose();
      audio.dispose();
      sceneRef.current = null;
      audioRef.current = null;
    };
  }, [toggleFocus]);

  useEffect(() => {
    const hydrateFrame = window.requestAnimationFrame(() => {
      setEndings(readStoredEndings());
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem("night-index-settings");
      } catch {
        // Storage can be unavailable in restricted browsing contexts.
      }
      if (stored) {
        try {
          const settings = JSON.parse(stored) as {
            soundEnabled?: boolean;
            soundCaptions?: boolean;
            reducedMotion?: boolean;
            reducedFlash?: boolean;
          };
          if (typeof settings.soundEnabled === "boolean") {
            setSoundEnabled(settings.soundEnabled);
          }
          if (typeof settings.soundCaptions === "boolean") {
            setSoundCaptions(settings.soundCaptions);
          }
          if (typeof settings.reducedMotion === "boolean") {
            setReducedMotion(settings.reducedMotion);
          } else if (
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            setReducedMotion(true);
          }
          if (typeof settings.reducedFlash === "boolean") {
            setReducedFlash(settings.reducedFlash);
          } else if (
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            setReducedFlash(true);
          }
        } catch {
          // Corrupt local preferences should not block the broadcast.
        }
      } else if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setReducedMotion(true);
        setReducedFlash(true);
      }
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(hydrateFrame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        "night-index-endings",
        JSON.stringify(endings),
      );
    } catch {
      // Persistence is optional; the current playthrough should continue.
    }
  }, [endings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        "night-index-settings",
        JSON.stringify({
          soundEnabled,
          soundCaptions,
          reducedMotion,
          reducedFlash,
        }),
      );
    } catch {
      // Preferences remain active in memory when storage is unavailable.
    }
  }, [
    hydrated,
    soundCaptions,
    soundEnabled,
    reducedFlash,
    reducedMotion,
  ]);

  useEffect(() => {
    if (!readyForPage) return;
    const page =
      getStoryPage(currentPageNumber, flags, endingsRef.current) ??
      getStoryPage(100, flags, endingsRef.current)!;
    sceneRef.current?.showPage(page, flags);
    audioRef.current?.setEffect(page.effect);

    if (soundCaptionsRef.current && page.soundCaption) {
      showCaption(page.soundCaption);
    }

    if (page.effect === "relay" || page.effect === "sealed") {
      audioRef.current?.cue("relay");
    } else if (page.effect === "scarf" || page.effect === "mirror") {
      audioRef.current?.cue("knock");
    } else if (page.page === 120) {
      audioRef.current?.cue("ring");
    } else if (page.effect === "countdown") {
      audioRef.current?.cue("siren");
    }
  }, [
    currentPageNumber,
    flags,
    readyForPage,
    showCaption,
  ]);

  useEffect(() => {
    sceneRef.current?.setSelection(selectedChoice);
  }, [selectedChoice]);

  useEffect(() => {
    sceneRef.current?.setRevealed(revealed);
  }, [revealed]);

  useEffect(() => {
    sceneRef.current?.setHold(hold);
  }, [hold]);

  useEffect(() => {
    sceneRef.current?.setFocus(focus);
  }, [focus]);

  useEffect(() => {
    sceneRef.current?.setSettings({ reducedMotion, reducedFlash });
  }, [reducedFlash, reducedMotion]);

  useEffect(() => {
    audioRef.current?.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (!remoteOpen) return;
    const focusFrame = window.requestAnimationFrame(() => {
      const panel = remotePanelRef.current;
      if (!panel) return;
      panel.scrollTop = 0;
      panel.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [remoteOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const focusFrame = window.requestAnimationFrame(() => {
      const panel = settingsPanelRef.current;
      if (!panel) return;
      panel.scrollTop = 0;
      panel.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [settingsOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!startedRef.current) return;

      if (event.key === "Escape") {
        const hadRemoteOpen = remoteOpen;
        const hadSettingsOpen = settingsOpen;
        setRemoteOpen(false);
        setSettingsOpen(false);
        if (focusRef.current) toggleFocus();
        window.requestAnimationFrame(() => {
          if (hadRemoteOpen) remoteTriggerRef.current?.focus();
          if (hadSettingsOpen) settingsTriggerRef.current?.focus();
        });
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'button, a, input, textarea, select, summary, [contenteditable="true"]',
        )
      ) {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        inputDigit(event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        eraseDigit();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (pageEntryRef.current) {
          const requested = Number(pageEntryRef.current);
          tuneRef.current(requested, flagsRef.current, false);
        } else if (selectedChoiceRef.current < 0) {
          setStatus("Select an action first.");
        } else {
          chooseRef.current(selectedChoiceRef.current);
        }
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const count = currentPageRef.current.choices.length;
        if (!count) return;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const next =
          selectedChoiceRef.current < 0
            ? direction > 0
              ? 0
              : count - 1
            : (selectedChoiceRef.current + direction + count) % count;
        selectedChoiceRef.current = next;
        setSelectedChoice(next);
        sceneRef.current?.setSelection(next);
        const item = currentPageRef.current.choices[next];
        const unlocked = requirementsMet(item.requires, flagsRef.current);
        setStatus(
          unlocked
            ? `Selected: ${item.label}. ${
                item.detail ?? "Press Enter to continue."
              }`
            : item.lockedMessage ?? "The signal breaks before that page.",
        );
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        toggleReveal();
      } else if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        toggleHold();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        tuneRef.current(151, flagsRef.current, false);
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        toggleFocus();
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setSoundEnabled((previous) => !previous);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    eraseDigit,
    inputDigit,
    remoteOpen,
    settingsOpen,
    toggleFocus,
    toggleHold,
    toggleReveal,
  ]);

  const visibleChoices = currentPage.choices.slice(0, 4);
  const pageCode = currentPage.page.toString().padStart(3, "0");
  return (
    <main
      className={[
        "game-shell",
        focus ? "is-focused" : "",
        reducedMotion ? "is-reduced-motion" : "",
        reducedFlash ? "is-reduced-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        ref={hostRef}
        className="scene-host"
        data-testid="scene-host"
        aria-hidden="true"
      />

      <div className="grain-overlay" aria-hidden="true" />
      <div className="top-chrome">
        <div className="broadcast-mark" aria-label="Bellwether Text">
          <span className="broadcast-mark__signal" aria-hidden="true">
            ▰
          </span>
          <span>BWT / NIGHT INDEX</span>
        </div>

        {started && (
          <div className="top-actions">
            <button
              type="button"
              className="quiet-button"
              onClick={toggleFocus}
              aria-pressed={focus}
              aria-label={focus ? "Step back to room view" : "Focus television screen"}
              data-testid="focus-toggle"
            >
              <span className="quiet-button__full">
                {focus ? "Step back" : "Focus screen"}
              </span>
              <span className="quiet-button__compact" aria-hidden="true">
                {focus ? "Room" : "Focus"}
              </span>
            </button>
            <button
              ref={remoteTriggerRef}
              type="button"
              className="quiet-button"
              onClick={() => {
                setRemoteOpen((previous) => !previous);
                setSettingsOpen(false);
              }}
              aria-expanded={remoteOpen}
              aria-controls="remote-panel"
              data-testid="remote-toggle"
            >
              <span className="quiet-button__full">
                {remoteOpen ? "Close remote" : "Open remote"}
              </span>
              <span className="quiet-button__compact" aria-hidden="true">
                {remoteOpen ? "Close" : "Remote"}
              </span>
            </button>
            <button
              ref={settingsTriggerRef}
              type="button"
              className="quiet-button icon-button"
              onClick={() => {
                setSettingsOpen((previous) => !previous);
                setRemoteOpen(false);
              }}
              aria-expanded={settingsOpen}
              aria-controls="settings-panel"
              aria-label={settingsOpen ? "Close settings" : "Open settings"}
              data-testid="settings-toggle"
            >
              ◉
            </button>
          </div>
        )}
      </div>

      {!started && (
        <section
          className="intro-panel"
          aria-labelledby="game-title"
          data-testid="intro-panel"
        >
          <p className="intro-panel__station">Bellwether Text, 02:13</p>
          <h1 id="game-title">Night Index</h1>
          <p className="intro-panel__subtitle">The Quiet Forecast</p>
          <p className="intro-panel__copy">
            At 02:13, a local television station begins printing the name of a
            woman Bellwether no longer remembers. Tune its numbered pages to
            trace seven missing autumns and make the last choice before the
            02:17 siren changes the room around you.
          </p>
          <div className="intro-panel__actions">
            <button
              type="button"
              className="tune-button"
              onClick={() => void beginExperience()}
              data-testid="start-game"
            >
              Tune channel 7
              <span aria-hidden="true">↗</span>
            </button>
            <button
              type="button"
              className="viewer-notice-toggle"
              onClick={() => setViewerNoticeOpen((open) => !open)}
              aria-expanded={viewerNoticeOpen}
              aria-controls="viewer-notice"
            >
              {viewerNoticeOpen
                ? "Close viewer notice"
                : "Read viewer notice"}
            </button>
          </div>
          {viewerNoticeOpen && (
            <div id="viewer-notice" className="viewer-notice">
              <p>
                Night Index is a short, single-player horror story told through
                an impossible local teletext broadcast.
              </p>
              <p>
                Use the remote or keyboard to tune printed page numbers, follow
                Mara Venn&apos;s traces, and decide which memory survives the 02:17
                siren.
              </p>
              <p className="viewer-notice__detail">
                Your choices persist in later broadcasts. The receiver holds
                four possible mornings.
              </p>
            </div>
          )}
          <div className="intro-panel__notes">
            <span>15–25 minutes</span>
            <span>Headphones recommended</span>
            <span>No spoken dialogue</span>
          </div>
          <label className="intro-sound">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            <span>Enable atmospheric sound</span>
          </label>
        </section>
      )}

      {started && (
        <>
          <div
            className={`page-entry ${pageEntry ? "is-visible" : ""}`}
            aria-live="polite"
          >
            P{pageEntry.padEnd(3, "–")}
          </div>

          <div className="game-status" role="status" aria-live="polite">
            <span className="game-status__page" data-testid="current-page">
              P{pageCode}
            </span>
            <span className="game-status__text">{status}</span>
          </div>

          <div
            className={`sound-caption ${soundCaption ? "is-visible" : ""}`}
            role="status"
            aria-live="polite"
          >
            {soundCaption}
          </div>

          <aside
            ref={remotePanelRef}
            id="remote-panel"
            className={`remote-panel ${remoteOpen ? "is-open" : ""}`}
            aria-label="Teletext remote"
            aria-hidden={!remoteOpen}
            hidden={!remoteOpen}
            tabIndex={-1}
          >
            <div className="panel-heading">
              <div>
                <p>Receiver control</p>
                <strong>P{pageEntry.padEnd(3, "–")}</strong>
              </div>
              <span className={`signal-dot ${isTuning ? "is-searching" : ""}`}>
                {isTuning ? "SEARCH" : "READY"}
              </span>
              <button
                type="button"
                className="panel-close"
                onClick={() => {
                  setRemoteOpen(false);
                  window.requestAnimationFrame(() =>
                    remoteTriggerRef.current?.focus(),
                  );
                }}
                aria-label="Close remote"
              >
                ×
              </button>
            </div>

            <div className="case-brief">
              <p>Signal note</p>
              <strong>
                {currentPage.objective ?? "The broadcast is still changing."}
              </strong>
            </div>

            <div className="number-pad" aria-label="Page number keypad">
              {keypad.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => (key === "⌫" ? eraseDigit() : inputDigit(key))}
                  disabled={isTuning}
                  aria-label={key === "⌫" ? "Erase page digit" : `Digit ${key}`}
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                className="number-pad__go"
                onClick={() => {
                  if (pageEntryRef.current) {
                    tuneRef.current(
                      Number(pageEntryRef.current),
                      flagsRef.current,
                      false,
                    );
                  }
                }}
                disabled={!pageEntry || isTuning}
              >
                Tune page
              </button>
            </div>

            <nav className="remote-links" aria-label="Current page links">
              {visibleChoices.map((item, index) => {
                const unlocked = requirementsMet(item.requires, flags);
                const choiceDetail = unlocked
                  ? item.detail
                  : item.lockedMessage ?? item.detail;
                const showDetail = selectedChoice === index;
                return (
                  <button
                    type="button"
                    key={`${item.page}-${item.label}`}
                    className={[
                      "remote-link",
                      `remote-link--${item.color}`,
                      unlocked ? "" : "is-locked",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectChoice(index)}
                    aria-disabled={!unlocked}
                    aria-current={selectedChoice === index ? "true" : undefined}
                    data-testid={`choice-${index}`}
                  >
                    <span className="remote-link__copy">
                      <span>
                        <span className="selection-mark" aria-hidden="true">
                          {selectedChoice === index ? "▸" : " "}
                        </span>
                        {item.label}
                      </span>
                      {showDetail && choiceDetail && (
                        <small>
                          {choiceDetail}
                          {selectedChoice === index &&
                          (item.kind === "decision" || item.kind === "ending")
                            ? " Choose again to commit."
                            : ""}
                        </small>
                      )}
                    </span>
                    <strong>{item.page}</strong>
                  </button>
                );
              })}
            </nav>

            <div className="remote-functions">
              <button
                type="button"
                onClick={toggleReveal}
                aria-pressed={revealed}
                disabled={!currentPage.hidden?.length || isTuning}
              >
                Reveal clue
              </button>
              <button
                type="button"
                onClick={() => tuneRef.current(151, flagsRef.current, false)}
                disabled={isTuning}
              >
                Receiver memory
              </button>
              <button type="button" onClick={toggleFocus} aria-pressed={focus}>
                Screen size
              </button>
            </div>
          </aside>

          <aside
            ref={settingsPanelRef}
            id="settings-panel"
            className={`settings-panel ${settingsOpen ? "is-open" : ""}`}
            aria-label="Game settings"
            aria-hidden={!settingsOpen}
            hidden={!settingsOpen}
            tabIndex={-1}
          >
            <div className="panel-heading">
              <div>
                <p>Receiver preferences</p>
                <strong>Settings</strong>
              </div>
              <button
                type="button"
                className="panel-close"
                onClick={() => {
                  setSettingsOpen(false);
                  window.requestAnimationFrame(() =>
                    settingsTriggerRef.current?.focus(),
                  );
                }}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <label className="setting-row">
              <span>
                <strong>Atmospheric sound</strong>
                <small>Hum, relay clicks, knocks, and signal tones.</small>
              </span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => {
                  setSoundEnabled(event.target.checked);
                  if (event.target.checked) {
                    void audioRef.current?.start();
                  }
                }}
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>Sound captions</strong>
                <small>Shows important non-speech audio events.</small>
              </span>
              <input
                type="checkbox"
                checked={soundCaptions}
                onChange={(event) => setSoundCaptions(event.target.checked)}
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>Reduced motion</strong>
                <small>Removes camera drift and shortens transitions.</small>
              </span>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) => setReducedMotion(event.target.checked)}
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>Reduced flashing</strong>
                <small>Softens signal pulses and parity corruption.</small>
              </span>
              <input
                type="checkbox"
                checked={reducedFlash}
                onChange={(event) => setReducedFlash(event.target.checked)}
              />
            </label>

            <div className="settings-help">
              <strong>Keyboard</strong>
              <p>
                0–9 page, Enter tune, arrows select, R reveal, H hold, Z size,
                N memory, M sound, Esc step back.
              </p>
            </div>

            <div className="asset-credit">
              <strong>Model sources</strong>
              <p>
                Television 01 by Gabriel Radić, Poly Haven, CC0. Television
                Vintage by Kenney, CC0. Teletext50 glyphs are public domain.
              </p>
            </div>
          </aside>
        </>
      )}

      <section className="sr-only" aria-live="polite">
        <h2>
          Page {pageCode}: {currentPage.title}
        </h2>
        <p>
          Signal note:{" "}
          {currentPage.objective ?? "The broadcast is still changing."}
        </p>
        {currentPage.body.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
        {revealed &&
          currentPage.hidden?.map((line, index) => (
            <p key={`hidden-${line}-${index}`}>Revealed: {line}</p>
          ))}
        <h3>Available page links</h3>
        <ul>
          {visibleChoices.map((item, index) => {
            const unlocked = requirementsMet(item.requires, flags);
            return (
              <li key={`transcript-${item.page}-${item.label}`}>
                {selectedChoice === index ? "Selected. " : ""}
                {unlocked
                  ? `${item.label}, page ${item.page}. ${item.detail ?? ""}`
                  : `${item.label}, page ${item.page}. Unavailable. ${
                      item.lockedMessage ?? item.detail ?? ""
                    }`}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
