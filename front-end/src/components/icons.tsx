/**
 * App icon set — Lucide glyphs wrapped in Chakra's `Icon` so they accept
 * Chakra style props (`boxSize`, `color`, `mr`, …) exactly like the old
 * `@chakra-ui/icons` did. Re-exported under the same names so adopting Lucide
 * was a one-line import-path change per file.
 *
 * One cohesive line family (even ~2px stroke, rounded caps) that matches the
 * soft violet/pill brand — replacing Chakra's mixed solid/outline default set.
 * Brand/diagram/share-target SVGs stay hand-rolled; this covers utility glyphs.
 *
 * Stroke weight etc. can be tuned here once and apply everywhere.
 */
import { type ElementType } from "react";
import { Icon, type IconProps } from "@chakra-ui/react";
import { SiX, SiWhatsapp, SiGithub } from "react-icons/si";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  X,
  Copy,
  ExternalLink,
  Menu,
  Lock,
  Moon,
  Sun,
  Clock,
  TriangleAlert,
  CircleAlert,
  ArrowUpRight,
  Image,
  type LucideIcon,
} from "lucide-react";

function lucide(Glyph: LucideIcon, displayName: string) {
  const Wrapped = (props: IconProps) => <Icon as={Glyph} {...props} />;
  Wrapped.displayName = displayName;
  return Wrapped;
}

export const AddIcon = lucide(Plus, "AddIcon");
export const ArrowBackIcon = lucide(ArrowLeft, "ArrowBackIcon");
export const ArrowForwardIcon = lucide(ArrowRight, "ArrowForwardIcon");
export const CheckIcon = lucide(Check, "CheckIcon");
export const ChevronDownIcon = lucide(ChevronDown, "ChevronDownIcon");
export const CloseIcon = lucide(X, "CloseIcon");
export const CopyIcon = lucide(Copy, "CopyIcon");
export const ExternalLinkIcon = lucide(ExternalLink, "ExternalLinkIcon");
export const HamburgerIcon = lucide(Menu, "HamburgerIcon");
export const LockIcon = lucide(Lock, "LockIcon");
export const MoonIcon = lucide(Moon, "MoonIcon");
export const SunIcon = lucide(Sun, "SunIcon");
export const TimeIcon = lucide(Clock, "TimeIcon");
export const WarningIcon = lucide(TriangleAlert, "WarningIcon");
export const WarningTwoIcon = lucide(CircleAlert, "WarningTwoIcon");
export const ArrowUpRightIcon = lucide(ArrowUpRight, "ArrowUpRightIcon");
export const ImageIcon = lucide(Image, "ImageIcon");

// ── Brand glyphs (simple-icons via react-icons) — logos Lucide doesn't ship.
// These are filled single-path marks, used only for share targets / external
// links (not general product chrome).
function brand(Glyph: ElementType, displayName: string) {
  const Wrapped = (props: IconProps) => <Icon as={Glyph} {...props} />;
  Wrapped.displayName = displayName;
  return Wrapped;
}

export const XIcon = brand(SiX, "XIcon");
export const WhatsAppIcon = brand(SiWhatsapp, "WhatsAppIcon");
export const GithubIcon = brand(SiGithub, "GithubIcon");
