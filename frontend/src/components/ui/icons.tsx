import React from 'react'

interface IconProps {
  size?: number
  className?: string
  color?: string
}

const icon = (
  paths: React.ReactNode,
  filled?: boolean
): React.FC<IconProps> => {
  const Icon: React.FC<IconProps> = ({ size = 20, className = '', color }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? (color || 'currentColor') : 'none'}
      stroke={color || 'currentColor'}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths}
    </svg>
  )
  Icon.displayName = 'Icon'
  return Icon
}

export const IconHome: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 14 15 14 15 21" />
    </>
  )(props)
IconHome.displayName = 'IconHome'

export const IconUsers: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  )(props)
IconUsers.displayName = 'IconUsers'

export const IconBox: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  )(props)
IconBox.displayName = 'IconBox'

export const IconBook: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="13" y2="11" />
    </>
  )(props)
IconBook.displayName = 'IconBook'

export const IconChart: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  )(props)
IconChart.displayName = 'IconChart'

export const IconSettings: React.FC<IconProps> = (props) =>
  icon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
    </>
  )(props)
IconSettings.displayName = 'IconSettings'

export const IconShield: React.FC<IconProps> = (props) =>
  icon(
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  )(props)
IconShield.displayName = 'IconShield'

export const IconLock: React.FC<IconProps> = (props) =>
  icon(
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  )(props)
IconLock.displayName = 'IconLock'

export const IconUnlock: React.FC<IconProps> = (props) =>
  icon(
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </>
  )(props)
IconUnlock.displayName = 'IconUnlock'

export const IconLogout: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  )(props)
IconLogout.displayName = 'IconLogout'

export const IconPlus: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  )(props)
IconPlus.displayName = 'IconPlus'

export const IconEdit: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  )(props)
IconEdit.displayName = 'IconEdit'

export const IconTrash: React.FC<IconProps> = (props) =>
  icon(
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  )(props)
IconTrash.displayName = 'IconTrash'

export const IconSearch: React.FC<IconProps> = (props) =>
  icon(
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  )(props)
IconSearch.displayName = 'IconSearch'

export const IconFilter: React.FC<IconProps> = (props) =>
  icon(
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  )(props)
IconFilter.displayName = 'IconFilter'

export const IconExport: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  )(props)
IconExport.displayName = 'IconExport'

export const IconUpload: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  )(props)
IconUpload.displayName = 'IconUpload'

export const IconDownload: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  )(props)
IconDownload.displayName = 'IconDownload'

export const IconSend: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  )(props)
IconSend.displayName = 'IconSend'

export const IconRefresh: React.FC<IconProps> = (props) =>
  icon(
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </>
  )(props)
IconRefresh.displayName = 'IconRefresh'

export const IconCheckCircle: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  )(props)
IconCheckCircle.displayName = 'IconCheckCircle'

export const IconXCircle: React.FC<IconProps> = (props) =>
  icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </>
  )(props)
IconXCircle.displayName = 'IconXCircle'

export const IconAlertTriangle: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  )(props)
IconAlertTriangle.displayName = 'IconAlertTriangle'

export const IconInfo: React.FC<IconProps> = (props) =>
  icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  )(props)
IconInfo.displayName = 'IconInfo'

export const IconClock: React.FC<IconProps> = (props) =>
  icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  )(props)
IconClock.displayName = 'IconClock'

export const IconEye: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  )(props)
IconEye.displayName = 'IconEye'

export const IconEyeOff: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  )(props)
IconEyeOff.displayName = 'IconEyeOff'

export const IconCamera: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  )(props)
IconCamera.displayName = 'IconCamera'

export const IconMessage: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </>
  )(props)
IconMessage.displayName = 'IconMessage'

export const IconBot: React.FC<IconProps> = (props) =>
  icon(
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="4" x2="12" y2="8" />
      <circle cx="12" cy="3" r="1" />
    </>
  )(props)
IconBot.displayName = 'IconBot'

export const IconUserCircle: React.FC<IconProps> = (props) =>
  icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 17c0-2.21-1.79-4-4-4s-4 1.79-4 4" />
      <circle cx="12" cy="9" r="3" />
    </>
  )(props)
IconUserCircle.displayName = 'IconUserCircle'

export const IconSparkle: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </>
  )(props)
IconSparkle.displayName = 'IconSparkle'

export const IconChevronDown: React.FC<IconProps> = (props) =>
  icon(
    <polyline points="6 9 12 15 18 9" />
  )(props)
IconChevronDown.displayName = 'IconChevronDown'

export const IconChevronRight: React.FC<IconProps> = (props) =>
  icon(
    <polyline points="9 18 15 12 9 6" />
  )(props)
IconChevronRight.displayName = 'IconChevronRight'

export const IconX: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  )(props)
IconX.displayName = 'IconX'

export const IconMoon: React.FC<IconProps> = (props) =>
  icon(
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  )(props)
IconMoon.displayName = 'IconMoon'

export const IconSun: React.FC<IconProps> = (props) =>
  icon(
    <>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </>
  )(props)
IconSun.displayName = 'IconSun'

export const IconDollar: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  )(props)
IconDollar.displayName = 'IconDollar'

export const IconTrendUp: React.FC<IconProps> = (props) =>
  icon(
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  )(props)
IconTrendUp.displayName = 'IconTrendUp'

export const IconTrendDown: React.FC<IconProps> = (props) =>
  icon(
    <>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </>
  )(props)
IconTrendDown.displayName = 'IconTrendDown'

export const IconDatabase: React.FC<IconProps> = (props) =>
  icon(
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </>
  )(props)
IconDatabase.displayName = 'IconDatabase'

export const IconKey: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zM15.5 7.5l3-3" />
      <line x1="18.5" y1="4.5" x2="20" y2="6" />
    </>
  )(props)
IconKey.displayName = 'IconKey'

export const IconFingerprint: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38-.16 4.42-.46 6.08" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.72" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
    </>
  )(props)
IconFingerprint.displayName = 'IconFingerprint'

export const IconCheck: React.FC<IconProps> = (props) =>
  icon(
    <polyline points="20 6 9 17 4 12" />
  )(props)
IconCheck.displayName = 'IconCheck'

export const IconUser: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  )(props)
IconUser.displayName = 'IconUser'

export const IconReceipt: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </>
  )(props)
IconReceipt.displayName = 'IconReceipt'

export const IconArrowRight: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  )(props)
IconArrowRight.displayName = 'IconArrowRight'

export const IconCalendar: React.FC<IconProps> = (props) =>
  icon(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  )(props)
IconCalendar.displayName = 'IconCalendar'

export const IconPrinter: React.FC<IconProps> = (props) =>
  icon(
    <>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  )(props)
IconPrinter.displayName = 'IconPrinter'

export const IconMinus: React.FC<IconProps> = (props) =>
  icon(
    <line x1="5" y1="12" x2="19" y2="12" />
  )(props)
IconMinus.displayName = 'IconMinus'

export const IconHistory: React.FC<IconProps> = (props) =>
  icon(
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </>
  )(props)
IconHistory.displayName = 'IconHistory'

export const IconMenu: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  )(props)
IconMenu.displayName = 'IconMenu'

export const IconChevronLeft: React.FC<IconProps> = (props) =>
  icon(
    <>
      <polyline points="15 18 9 12 15 6" />
    </>
  )(props)
IconChevronLeft.displayName = 'IconChevronLeft'

export const IconPin: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-2l-2-3V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7l-2 3v2z" />
    </>
  )(props)
IconPin.displayName = 'IconPin'

export const IconPinOff: React.FC<IconProps> = (props) =>
  icon(
    <>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M12 17v5" />
      <path d="M9 9v3l-2 3v2h10m-3-12a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    </>
  )(props)
IconPinOff.displayName = 'IconPinOff'

