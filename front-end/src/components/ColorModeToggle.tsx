"use client";

import {
  IconButton,
  useColorMode,
  useColorModeValue,
  type IconButtonProps,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

/**
 * Light/dark theme toggle. Shows the icon for the mode you'd switch *to*
 * (moon while in light, sun while in dark) and flips Chakra's color mode,
 * which is persisted to localStorage.
 */
export function ColorModeToggle(props: Partial<IconButtonProps>) {
  const { toggleColorMode } = useColorMode();
  const SwitchIcon = useColorModeValue(MoonIcon, SunIcon);
  const nextMode = useColorModeValue("dark", "light");

  return (
    <IconButton
      aria-label={`Switch to ${nextMode} mode`}
      title={`Switch to ${nextMode} mode`}
      icon={<SwitchIcon />}
      onClick={toggleColorMode}
      variant="ghost"
      borderRadius="full"
      boxSize="36px"
      minW="36px"
      color="text.secondary"
      _hover={{ bg: "bg.surfaceAlt", color: "text.accent" }}
      {...props}
    />
  );
}

export default ColorModeToggle;
