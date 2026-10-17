'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface NavigationContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  isPinned: boolean;
  setIsPinned: (pinned: boolean) => void;
  togglePin: () => void;
  autoCloseEnabled: boolean;
  setAutoCloseEnabled: (enabled: boolean) => void;
  toggleAutoClose: () => void;
  countdown: number;
  isHovered: boolean;
  pauseAutoCloseTimer: () => void;
  resumeAutoCloseTimer: () => void;
  resetAutoCloseTimer: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isOpen: true,
  toggleSidebar: () => {},
  openSidebar: () => {},
  closeSidebar: () => {},
  isPinned: true,
  setIsPinned: () => {},
  togglePin: () => {},
  autoCloseEnabled: false,
  setAutoCloseEnabled: () => {},
  toggleAutoClose: () => {},
  countdown: 5,
  isHovered: false,
  pauseAutoCloseTimer: () => {},
  resumeAutoCloseTimer: () => {},
  resetAutoCloseTimer: () => {},
});

const AUTO_CLOSE_SECONDS = 5;

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  // Navigation defaults to pinned (docked) for standard desktop retail workflow
  const [isPinned, setIsPinnedState] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [autoCloseEnabled, setAutoCloseEnabledState] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS);
  const [isHovered, setIsHovered] = useState(false);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoveredRef = useRef(false);
  const autoCloseEnabledRef = useRef(false);
  const isOpenRef = useRef(true);
  const isPinnedRef = useRef(true);

  // Sync refs for interval and event callbacks
  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    autoCloseEnabledRef.current = autoCloseEnabled;
  }, [autoCloseEnabled]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isPinnedRef.current = isPinned;
  }, [isPinned]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPinned = localStorage.getItem('titan_nav_pinned');
      if (savedPinned === 'false') {
        setIsPinnedState(false);
        const savedOpen = localStorage.getItem('titan_nav_open');
        if (savedOpen === 'false') {
          setIsOpen(false);
        }
      } else {
        // Defaults to pinned & open
        setIsPinnedState(true);
        setIsOpen(true);
      }

      const savedAutoClose = localStorage.getItem('titan_nav_autoclose');
      if (savedAutoClose === 'true') {
        setAutoCloseEnabledState(true);
      }
    } catch (e) {
      // localStorage may fail in restricted/private modes
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    // Never auto-close if navigation is pinned
    if (isPinnedRef.current) return;

    setCountdown(AUTO_CLOSE_SECONDS);

    countdownIntervalRef.current = setInterval(() => {
      // If hovering or pinned, pause ticking
      if (isHoveredRef.current || isPinnedRef.current) {
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsOpen(false);
          try {
            localStorage.setItem('titan_nav_open', 'false');
          } catch (e) {}
          return AUTO_CLOSE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // Handle timer start/stop when isOpen or autoCloseEnabled changes
  useEffect(() => {
    if (isOpen && autoCloseEnabled && !isPinned) {
      startTimer();
    } else {
      clearTimer();
      setCountdown(AUTO_CLOSE_SECONDS);
    }

    return () => {
      clearTimer();
    };
  }, [isOpen, autoCloseEnabled, isPinned, startTimer, clearTimer]);

  const openSidebar = useCallback(() => {
    if (isOpenRef.current) return; // Prevent duplicate state updates during animation
    setIsOpen(true);
    try {
      localStorage.setItem('titan_nav_open', 'true');
    } catch (e) {}
    if (autoCloseEnabledRef.current && !isPinnedRef.current) {
      startTimer();
    }
  }, [startTimer]);

  const closeSidebar = useCallback(() => {
    if (!isOpenRef.current) return;
    clearTimer();
    setIsOpen(false);
    // If user explicitly closes the sidebar, also unpin so it doesn't immediately force reopen
    if (isPinnedRef.current) {
      setIsPinnedState(false);
      try {
        localStorage.setItem('titan_nav_pinned', 'false');
      } catch (e) {}
    }
    try {
      localStorage.setItem('titan_nav_open', 'false');
    } catch (e) {}
  }, [clearTimer]);

  const toggleSidebar = useCallback(() => {
    if (isOpenRef.current) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }, [closeSidebar, openSidebar]);

  const setIsPinned = useCallback(
    (pinned: boolean) => {
      setIsPinnedState(pinned);
      try {
        localStorage.setItem('titan_nav_pinned', String(pinned));
      } catch (e) {}
      if (pinned) {
        // If pinned, ensure navigation is open and timer is cleared
        setIsOpen(true);
        clearTimer();
        try {
          localStorage.setItem('titan_nav_open', 'true');
        } catch (e) {}
      } else {
        if (autoCloseEnabledRef.current && isOpenRef.current) {
          startTimer();
        }
      }
    },
    [clearTimer, startTimer]
  );

  const togglePin = useCallback(() => {
    setIsPinned(!isPinnedRef.current);
  }, [setIsPinned]);

  const setAutoCloseEnabled = useCallback(
    (enabled: boolean) => {
      setAutoCloseEnabledState(enabled);
      try {
        localStorage.setItem('titan_nav_autoclose', String(enabled));
      } catch (e) {}
      if (enabled && isOpenRef.current && !isPinnedRef.current) {
        startTimer();
      } else {
        clearTimer();
        setCountdown(AUTO_CLOSE_SECONDS);
      }
    },
    [startTimer, clearTimer]
  );

  const toggleAutoClose = useCallback(() => {
    setAutoCloseEnabled(!autoCloseEnabledRef.current);
  }, [setAutoCloseEnabled]);

  const pauseAutoCloseTimer = useCallback(() => {
    if (isHoveredRef.current) return;
    setIsHovered(true);
  }, []);

  const resumeAutoCloseTimer = useCallback(() => {
    if (!isHoveredRef.current) return;
    setIsHovered(false);
    // Restart full 5s countdown when cursor leaves
    if (isOpenRef.current && autoCloseEnabledRef.current && !isPinnedRef.current) {
      startTimer();
    }
  }, [startTimer]);

  const resetAutoCloseTimer = useCallback(() => {
    if (isOpenRef.current && autoCloseEnabledRef.current && !isPinnedRef.current) {
      startTimer();
    }
  }, [startTimer]);

  return (
    <NavigationContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        isPinned,
        setIsPinned,
        togglePin,
        autoCloseEnabled,
        setAutoCloseEnabled,
        toggleAutoClose,
        countdown,
        isHovered,
        pauseAutoCloseTimer,
        resumeAutoCloseTimer,
        resetAutoCloseTimer,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
