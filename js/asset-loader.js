((root) => {
  function createAssetStore(manifest, createImage) {
    const assetMeta = Array.isArray(manifest) ? manifest : [];
    const imageFactory = createImage || (() => new root.Image());
    const assets = assetMeta.reduce((map, meta) => {
      if (meta && meta.key) map[meta.key] = imageFactory();
      return map;
    }, {});

    function loadAssets(onProgress, cb) {
      let loaded = 0;
      let errors = 0;
      let requiredDone = 0;
      const total = assetMeta.length;
      const requiredTotal = assetMeta.filter(meta => meta && meta.required).length;
      let readyNotified = false;

      if (total === 0) {
        if (onProgress) onProgress(1);
        if (cb) cb();
        return;
      }

      const notifyReady = () => {
        if (!readyNotified && requiredDone >= requiredTotal) {
          readyNotified = true;
          if (cb) cb();
        }
      };

      const onDone = () => {
        if (onProgress) onProgress(requiredTotal === 0 ? 1 : requiredDone / requiredTotal);
        notifyReady();
        if (loaded + errors === total && errors > 0) {
          root.console?.warn?.('[喵喵突击队] 资源加载完成，' + errors + '/' + total + ' 个失败');
        }
      };

      for (const meta of assetMeta) {
        if (!meta || !meta.key) {
          errors++;
          onDone();
          continue;
        }
        const img = assets[meta.key] || (assets[meta.key] = imageFactory());
        img.onload = () => {
          loaded++;
          if (meta.required) requiredDone++;
          onDone();
        };
        img.onerror = () => {
          errors++;
          if (meta.required) requiredDone++;
          onDone();
        };
        img.src = meta.src;
      }
    }

    return { assets, loadAssets };
  }

  const api = { createAssetStore };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CAT_FLAG_ASSET_LOADER = api;
})(typeof window !== 'undefined' ? window : globalThis);
