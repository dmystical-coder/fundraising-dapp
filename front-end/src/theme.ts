import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

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
        textDecoration: "underline",
      },
    },
    "*:focus-visible": {
      outline: "2px solid",
      outlineColor: "primary.400",
      outlineOffset: "2px",
      borderRadius: "sm",
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
      solid: (props: { colorScheme: string }) => {
        const { colorScheme: c } = props;
        if (["primary", "secondary", "warning", "success", "error", "brand"].includes(c)) {
          return {
            bg: `${c}.500`,
            color: "white",
            _hover: {
              bg: `${c}.600`,
              color: "white",
              _disabled: {
                bg: `${c}.500`,
              },
            },
            _active: {
              bg: `${c}.700`,
              color: "white",
            },
          };
        }
        return {
          bg: `${c}.500`,
          color: "white",
          _hover: {
            bg: `${c}.600`,
          },
          _active: {
            bg: `${c}.700`,
          },
        };
      },
      outline: (props: { colorScheme: string }) => {
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
        color: "chakra-body-text",
        _hover: {
          bg: "mutedBg",
          color: "chakra-body-text",
        },
        _active: {
          bg: "chakra-border-color",
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
        boxShadow: "0 1px 3px 0 rgba(124, 58, 237, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
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
        color: "gray.500",
        fontSize: "sm",
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
        color: "gray.500",
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
          bg: "surfaceBg",
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
          },
        },
      },
    },
  },
};

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  colors,
  fonts,
  styles,
  components,
  config,
  semanticTokens: {
    colors: {
      "chakra-body-bg": { _light: "warm.bg", _dark: "gray.900" },
      "chakra-body-text": { _light: "gray.800", _dark: "gray.50" },
      "chakra-border-color": { _light: "warm.border", _dark: "gray.700" },
      surfaceBg: { _light: "warm.surface", _dark: "gray.800" },
      mutedBg: { _light: "warm.muted", _dark: "gray.700" },
      linkColor: { _light: "primary.600", _dark: "primary.300" },
      linkHoverColor: { _light: "primary.700", _dark: "primary.200" },
      heroBg: { _light: "linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 100%)", _dark: "gray.900" },
    },
  },
});

export default theme;
