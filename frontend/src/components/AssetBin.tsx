import { useEditorStore } from '../store/editorStore.js';
import type { Asset } from '../types.js';

export function AssetBin() {
  const assets = Array.from(useEditorStore((state) => state.assets).values());

  return (
    <div className="asset-bin w-64 border-r border-gray-300 bg-gray-50 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Asset Bin</h2>
      {assets.length === 0 ? (
        <p className="text-gray-500 text-sm">No assets yet. Generate some content!</p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <AssetItem key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetItem({ asset }: { asset: Asset }) {
  return (
    <div className="asset-item p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer">
      <div className="text-sm font-medium truncate">{asset.type}</div>
      <div className="text-xs text-gray-500 truncate mt-1">{asset.url}</div>
      {asset.duration && (
        <div className="text-xs text-gray-400 mt-1">{asset.duration.toFixed(1)}s</div>
      )}
    </div>
  );
}

