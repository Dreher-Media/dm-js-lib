// Global type declarations for external dependencies

declare global {
  interface Window {
    FsCC?: {
      store: {
        consents: Record<string, boolean>;
      };
      consentController: {
        on(event: string, callback: (consents: unknown) => void): void;
      };
    };
    Webflow?: {
      push(callback: () => void): void;
    };
    Plyr?: {
      setup(targets: string | Element | NodeListOf<Element> | Element[]): Plyr[];
    };
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: {
            start?: number;
            rel?: number;
          };
          events?: {
            onReady?: (event: { target: YT.Player }) => void;
            onStateChange?: (event: { data: number; target: YT.Player }) => void;
          };
        },
      ) => YT.Player;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    Vimeo?: {
      Player: new (
        elementId: string,
        config: {
          id: string;
          autoplay?: boolean;
          start?: number;
        },
      ) => Vimeo.Player;
    };
    dailymotion?: {
      createPlayer(
        elementId: string,
        config: {
          video: string;
          params?: {
            autoplay?: number;
            start?: number;
            mute?: boolean;
          };
        },
      ): Promise<DailymotionPlayer>;
    };
    videoSwipers?: Swiper[];
    dmReinitVideoPlayers?: (container: HTMLElement) => void;
  }

  interface Plyr {
    play(): void;
    pause(): void;
    stop(): void;
    on(event: string, callback: () => void): void;
  }

  interface YT {
    Player: {
      new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: {
            start?: number;
            rel?: number;
          };
          events?: {
            onReady?: (event: { target: YT.Player }) => void;
            onStateChange?: (event: { data: number; target: YT.Player }) => void;
          };
        },
      ): YT.Player;
    };
    PlayerState: {
      PLAYING: number;
      PAUSED: number;
      ENDED: number;
    };
  }

  interface YT {
    Player: {
      playVideo(): void;
      pauseVideo(): void;
    };
  }

  interface Vimeo {
    Player: {
      new (
        elementId: string,
        config: {
          id: string;
          autoplay?: boolean;
          start?: number;
        },
      ): Vimeo.Player;
    };
  }

  interface Vimeo {
    Player: {
      play(): void;
      pause(): void;
      on(event: string, callback: () => void): void;
    };
  }

  interface DailymotionPlayer {
    play(): void;
    pause(): void;
    on(event: string, callback: () => void): void;
  }

  interface Swiper {
    autoplay: {
      start(): void;
      stop(): void;
    };
    on(event: string, callback: () => void): void;
  }

  // Global video swipers array (initialized by videoPlayers module, can be extended by external code)
  var videoSwipers: Swiper[] | undefined;
}

export {};
