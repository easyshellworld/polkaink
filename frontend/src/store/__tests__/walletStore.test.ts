import { useWalletStore } from '../walletStore';

describe('walletStore', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: null,
      walletClient: null,
      balance: '0',
      chainId: null,
      isConnecting: false,
    });
  });

  it('has correct initial state', () => {
    const state = useWalletStore.getState();
    expect(state.address).toBeNull();
    expect(state.walletClient).toBeNull();
    expect(state.balance).toBe('0');
    expect(state.chainId).toBeNull();
    expect(state.isConnecting).toBe(false);
  });

  it('setWallet updates all fields', () => {
    const mockWalletClient = {} as never;
    useWalletStore.getState().setWallet(
      '0x70c2aDa29240E6dA4cc978E10f8AFB9082Cc95B9',
      mockWalletClient,
      '100.5',
      420420417
    );

    const state = useWalletStore.getState();
    expect(state.address).toBe('0x70c2aDa29240E6dA4cc978E10f8AFB9082Cc95B9');
    expect(state.balance).toBe('100.5');
    expect(state.chainId).toBe(420420417);
    expect(state.isConnecting).toBe(false);
  });

  it('clearWallet resets to initial state', () => {
    const mockWalletClient = {} as never;
    useWalletStore.getState().setWallet('0xabc', mockWalletClient, '50', 420420417);
    useWalletStore.getState().clearWallet();

    const state = useWalletStore.getState();
    expect(state.address).toBeNull();
    expect(state.walletClient).toBeNull();
    expect(state.balance).toBe('0');
  });

  it('setConnecting toggles flag', () => {
    useWalletStore.getState().setConnecting(true);
    expect(useWalletStore.getState().isConnecting).toBe(true);

    useWalletStore.getState().setConnecting(false);
    expect(useWalletStore.getState().isConnecting).toBe(false);
  });
});
