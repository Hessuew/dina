type SidebarState = 'expanded' | 'collapsed'
type SidebarVariant = 'sidebar' | 'floating' | 'inset'
type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'

/**
 * The desktop `data-collapsible` attribute is only meaningful while the sidebar
 * is collapsed; when expanded it must be blank so the collapsed-state CSS
 * selectors don't apply.
 */
export function resolveSidebarCollapsibleState(
  state: SidebarState,
  collapsible: SidebarCollapsible,
): SidebarCollapsible | '' {
  return state === 'collapsed' ? collapsible : ''
}

/** Floating and inset variants share the same padded layout treatment. */
function isFloatingOrInset(variant: SidebarVariant): boolean {
  return variant === 'floating' || variant === 'inset'
}

/** Variant-dependent icon-collapse width for the desktop sidebar gap. */
export function resolveSidebarGapClassName(variant: SidebarVariant): string {
  return isFloatingOrInset(variant)
    ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
    : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
}

/** Variant-dependent padding/border for the desktop sidebar container. */
export function resolveSidebarContainerVariantClassName(
  variant: SidebarVariant,
): string {
  return isFloatingOrInset(variant)
    ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
    : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l'
}
