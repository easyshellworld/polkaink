const i18n = {
  language: 'en',
  t: (key: string, options?: Record<string, unknown>) => {
    if (key === 'common.time_dh') {
      return `${options?.days}d ${options?.hours}h remaining`;
    }
    if (key === 'common.time_hm') {
      return `${options?.hours}h ${options?.mins}m remaining`;
    }
    if (key === 'common.ended') {
      return 'Ended';
    }
    return key;
  },
};

export default i18n;