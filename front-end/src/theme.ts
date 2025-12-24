import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

// Warm, approachable color palette for GoFundMe-style fundraising platform
const colors = {
  // Primary - Warm Amber/Orange for CTAs and highlights
  primary: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B", // Main primary
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },
  // Secondary - Soft Teal for accents and links
  secondary: {
    50: "#F0FDFA",
    100: "#CCFBF1",
    200: "#99F6E4",
    300: "#5EEAD4",
    400: "#2DD4BF",
    500: "#14B8A6", // Main secondary
    600: "#0D9488",
    700: "#0F766E",
    800: "#115E59",
    900: "#134E4A",
  },
  // Success - Trust green for funded/withdrawn states
  success: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E", // Main success
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
  },
  // Warning - Soft orange for "ending soon"
  warning: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C", // Main warning
    500: "#F97316",
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
  },
  // Error - Muted red for cancelled/errors
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444", // Main error
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  // Warm backgrounds
  warm: {
    bg: "#FFFBF5", // Warm off-white page background
    surface: "#FFFFFF", // Card/panel surface
    border: "#F3E8DC", // Warm border color
    muted: "#F5F0EB", // Muted warm background
  },
  // Brand alias (for compatibility)
  brand: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },
};

// Font configuration
const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  mono: `'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
};

// Global styles
const styles = {
  global: {
    "html, body": {
      bg: "warm.bg",
      color: "gray.800",
    },
    a: {
      color: "secondary.600",
      _hover: {
        color: "secondary.700",
        textDecoration: "underline",
      },
    },
  },
};

// Component style overrides
const components = {
  Button: {
    baseStyle: {
      fontWeight: "600",
      borderRadius: "lg",
    },
    variants: {
      // Function-based solid variant to properly set text color based on colorScheme
      solid: (props: { colorScheme: string }) => {
        const { colorScheme: c } = props;
        // For primary, secondary, warning, success, error - use white text
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
        // Default for other colorSchemes
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
        color: "gray.700",
        _hover: {
          bg: "warm.muted",
          color: "gray.900",
        },
        _active: {
          bg: "warm.border",
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
        bg: "warm.surface",
        borderRadius: "xl",
        boxShadow: "0 4px 6px -1px rgba(180, 83, 9, 0.05), 0 2px 4px -1px rgba(180, 83, 9, 0.03)",
        border: "1px solid",
        borderColor: "warm.border",
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
        bg: "warm.muted",
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
      color: "gray.800",
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
        bg: "warm.surface",
        p: 4,
        borderRadius: "lg",
        border: "1px solid",
        borderColor: "warm.border",
      },
      label: {
        color: "gray.500",
        fontSize: "sm",
        fontWeight: "500",
      },
      number: {
        color: "gray.800",
        fontWeight: "700",
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: "warm.border",
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
        bg: "warm.surface",
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
};

// Theme configuration
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
  // Semantic tokens for easier theming
  semanticTokens: {
    colors: {
      "chakra-body-bg": "warm.bg",
      "chakra-body-text": "gray.800",
      "chakra-border-color": "warm.border",
    },
  },
});

export default theme;
