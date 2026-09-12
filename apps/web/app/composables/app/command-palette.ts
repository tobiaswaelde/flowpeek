/** Share command-palette visibility between the global modal and navbar trigger. */
export function useCommandPalette() {
  const open = useState<boolean>('ezrepo.command-palette.open', () => false);

  return {
    close: () => {
      open.value = false;
    },
    open,
    show: () => {
      open.value = true;
    },
  };
}
