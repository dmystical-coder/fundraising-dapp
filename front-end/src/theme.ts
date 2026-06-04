import {
  extendTheme,
  type ThemeConfig,
  type StyleFunctionProps,
} from "@chakra-ui/react";

const colors = {
  primary: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#7C3AED",
    600: "#6D28D9",
    700: "#5B21B6",
    800: "#4C1D95",
    900: "#3B0764",
  },
  secondary: {
    50: "#F0FDFA",
    100: "#CCFBF1",
    200: "#99F6E4",
    300: "#5EEAD4",
    400: "#2DD4BF",
    500: "#14B8A6",
    600: "#0D9488",
    700: "#0F766E",
    800: "#115E59",
    900: "#134E4A",
  },
  success: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
  },
  warning: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316",
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
  },
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  warm: {
    bg: "#FAFAFF",
    surface: "#FFFFFF",
    border: "#E2E0ED",
    muted: "#F0EEF8",
  },
  brand: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#7C3AED",
    600: "#6D28D9",
    700: "#5B21B6",
    800: "#4C1D95",
    900: "#3B0764",
  },
};

const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  mono: `'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
};

const textStyles = {
  display: {
    fontSize: { base: "2xl", md: "4xl", lg: "5xl" },
    lineHeight: "1.1",
    fontWeight: "800",
    letterSpacing: "-0.02em",
  },
  h1: {
    fontSize: { base: "2xl", md: "3xl" },
    lineHeight: "1.2",
    fontWeight: "700",
    letterSpacing: "-0.01em",
  },
  h2: {
    fontSize: { base: "xl", md: "2xl" },
    lineHeight: "1.25",
    fontWeight: "700",
  },
  h3: {
    fontSize: { base: "lg", md: "xl" },
    lineHeight: "1.3",
    fontWeight: "700",
  },
  body: {
    fontSize: { base: "md", md: "lg" },
    lineHeight: "1.6",
  },
  bodySm: {
    fontSize: "sm",
    lineHeight: "1.5",
  },
  caption: {
    fontSize: "xs",
    lineHeight: "1.4",
    letterSpacing: "0.01em",
  },
  label: {
    fontSize: "sm",
    lineHeight: "1.4",
    fontWeight: "600",
    letterSpacing: "0.01em",
  },
};

const styles = {
  global: {
    "html, body": {
      bg: "chakra-body-bg",
      color: "chakra-body-text",
    },
    a: {
      color: "linkColor",
      _hover: {
        color: "linkHoverColor",
        textDecoration: "none",
      },
    },
    "*:focus-visible": {
      outline: "none",
      boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)",
      borderRadius: "var(--chakra-radii-md)",
    },
  },
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: "600",
      borderRadius: "lg",
    },
    variants: {
      solid: (props: StyleFunctionProps) => {
        const { colorScheme: c } = props;
        if (["primary", "secondary", "warning", "success", "error", "brand"].includes(c)) {
          return {
            bg: `${c}.500`,
            color: "text.inverse",
            _hover: {
              bg: `${c}.600`,
              color: "text.inverse",
              _disabled: {
                bg: `${c}.500`,
              },
            },
            _active: {
              bg: `${c}.700`,
              color: "text.inverse",
            },
          };
        }
        return {
          bg: `${c}.500`,
          color: "text.inverse",
          _hover: {
            bg: `${c}.600`,
          },
          _active: {
            bg: `${c}.700`,
          },
        };
      },
      outline: (props: StyleFunctionProps) => {
        const { colorScheme: c } = props;
        return {
          borderColor: `${c}.500`,
          color: `${c}.700`,
          _hover: {
            bg: `${c}.50`,
            color: `${c}.800`,
            borderColor: `${c}.600`,
          },
          _active: {
            bg: `${c}.100`,
            color: `${c}.900`,
          },
        };
      },
      ghost: {
        color: "text.primary",
        _hover: {
          bg: "bg.surfaceAlt",
          color: "text.primary",
        },
        _active: {
          bg: "border.default",
        },
      },
    },
    defaultProps: {
      colorScheme: "primary",
      variant: "solid",
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: "surfaceBg",
        borderRadius: "xl",
        boxShadow: "card",
        border: "1px solid",
        borderColor: "chakra-border-color",
      },
    },
  },
  Badge: {
    baseStyle: {
      borderRadius: "full",
      px: 3,
      py: 1,
      fontWeight: "600",
      fontSize: "xs",
      textTransform: "uppercase",
    },
    variants: {
      active: {
        bg: "success.100",
        color: "success.700",
      },
      ended: {
        bg: "gray.100",
        color: "gray.600",
      },
      cancelled: {
        bg: "error.100",
        color: "error.700",
      },
      withdrawn: {
        bg: "secondary.100",
        color: "secondary.700",
      },
      warning: {
        bg: "warning.100",
        color: "warning.700",
      },
    },
  },
  Progress: {
    baseStyle: {
      track: {
        bg: "mutedBg",
        borderRadius: "full",
      },
      filledTrack: {
        bg: "primary.500",
        borderRadius: "full",
      },
    },
    variants: {
      success: {
        filledTrack: {
          bg: "success.500",
        },
      },
    },
  },
  Heading: {
    baseStyle: {
      color: "chakra-body-text",
      fontWeight: "700",
    },
  },
  Text: {
    variants: {
      muted: {
        color: "text.secondary",
        fontSize: "sm",
      },
      caption: {
        color: "text.tertiary",
        fontSize: "xs",
      },
      body: {
        color: "text.primary",
      },
      amount: {
        fontFamily: "mono",
        fontWeight: "600",
      },
    },
  },
  Stat: {
    baseStyle: {
      container: {
        bg: "surfaceBg",
        p: 4,
        borderRadius: "lg",
        border: "1px solid",
        borderColor: "chakra-border-color",
      },
      label: {
        color: "text.secondary",
        fontSize: "sm",
        fontWeight: "500",
      },
      number: {
        color: "chakra-body-text",
        fontWeight: "700",
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: "chakra-border-color",
          bg: "bg.field",
          _hover: {
            borderColor: "primary.300",
          },
          _focus: {
            borderColor: "primary.500",
            boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
          },
        },
      },
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: "surfaceBg",
        borderRadius: "xl",
      },
    },
  },
  Alert: {
    variants: {
      subtle: {
        container: {
          borderRadius: "lg",
        },
      },
    },
  },
  Tabs: {
    variants: {
      enclosed: {
        tab: {
          _selected: {
            color: "primary.600",
            borderColor: "primary.500",
            bg: "bg.surface",
          },
        },
      },
    },
  },
  Menu: {
    baseStyle: {
      list: {
        bg: "surfaceBg",
        borderWidth: "1px",
        borderColor: "border.default",
        borderRadius: "xl",
        boxShadow: "card",
        py: 2,
        px: 2,
        minW: "48",
      },
      item: {
        borderRadius: "lg",
        fontSize: "sm",
        fontWeight: "600",
        color: "text.primary",
        bg: "transparent",
        px: 3,
        py: 2.5,
        _hover: { bg: "bg.surfaceAlt" },
        _focus: { bg: "bg.surfaceAlt" },
        _active: { bg: "border.default" },
      },
      groupTitle: {
        mx: 3,
        my: 2,
        fontSize: "xs",
        fontWeight: "600",
        color: "text.tertiary",
      },
      divider: {
        borderColor: "border.subtle",
        my: 1,
      },
    },
  },
};

const config: ThemeConfig = {
  // Follow the visitor's OS preference on first visit; once they use the
  // toggle, Chakra persists that choice to localStorage and stops following.
  initialColorMode: "system",
  useSystemColorMode: false,
};

const theme = extendTheme({
  colors,
  fonts,
  textStyles,
  styles,
  components,
  radii: {
    input: "lg",
    surface: "xl",
  },
  shadows: {
    card: "0 10px 30px -18px rgba(124, 58, 237, 0.35)",
    focusRing: "0 0 0 3px var(--chakra-colors-focus-ring)",
  },
  config,
  semanticTokens: {
    colors: {
      "chakra-body-bg": { _light: "warm.bg", _dark: "gray.950" },
      "chakra-body-text": { _light: "gray.800", _dark: "gray.100" },
      "chakra-border-color": { _light: "warm.border", _dark: "gray.700" },
      surfaceBg: { _light: "warm.surface", _dark: "gray.900" },
      mutedBg: { _light: "warm.muted", _dark: "gray.800" },
      linkColor: { _light: "primary.600", _dark: "primary.300" },
      linkHoverColor: { _light: "primary.700", _dark: "primary.200" },
      heroBg: {
        _light: "linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 100%)",
        _dark: "linear-gradient(180deg, #111827 0%, #1f2937 100%)",
      },
      "bg.canvas": { _light: "warm.bg", _dark: "gray.950" },
      "bg.surface": { _light: "warm.surface", _dark: "gray.900" },
      "bg.surfaceAlt": { _light: "warm.muted", _dark: "gray.800" },
      "bg.accentSubtle": { _light: "primary.50", _dark: "primary.900" },
      "bg.field": { _light: "warm.surface", _dark: "gray.900" },
      "bg.nav": { _light: "whiteAlpha.900", _dark: "blackAlpha.500" },
      "bg.overlay": { _light: "blackAlpha.300", _dark: "blackAlpha.600" },
      "text.primary": { _light: "gray.800", _dark: "gray.100" },
      "text.secondary": { _light: "gray.600", _dark: "gray.300" },
      "text.tertiary": { _light: "gray.500", _dark: "gray.400" },
      "text.accent": { _light: "primary.600", _dark: "primary.300" },
      "text.inverse": { _light: "white", _dark: "white" },
      "text.success": { _light: "success.700", _dark: "success.300" },
      "text.warning": { _light: "warning.700", _dark: "warning.300" },
      "text.danger": { _light: "error.700", _dark: "error.300" },
      "border.default": { _light: "warm.border", _dark: "gray.700" },
      "border.subtle": { _light: "gray.100", _dark: "gray.800" },
      "border.accent": { _light: "primary.300", _dark: "primary.500" },
      "focus.ring": { _light: "primary.300", _dark: "primary.500" },
      "scrollbar.track": { _light: "warm.muted", _dark: "gray.800" },
      "scrollbar.thumb": { _light: "primary.500", _dark: "primary.400" },
      "scrollbar.thumbHover": { _light: "primary.600", _dark: "primary.300" },
    },
    radii: {
      surface: { default: "xl" },
      interactive: { default: "lg" },
    },
    shadows: {
      surface: { default: "card" },
      focus: { default: "0 0 0 3px var(--chakra-colors-focus-ring)" },
    },
    space: {
      "layout.gutter": { default: "6" },
    },
  },
});

export default theme;
