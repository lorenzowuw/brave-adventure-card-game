/**
 * 资源路径前缀拼接。
 * 普通 dev/build 时 BASE_URL='/'，产出 '/assets/...'；
 * 单文件离线分发(SINGLEFILE=1)时 BASE_URL='./'，产出 './assets/...'，
 * 使双击 index.html(file://) 也能正确加载图片。
 */
const BASE = import.meta.env.BASE_URL;

export function asset(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return BASE.endsWith('/') ? `${BASE}${clean}` : `${BASE}/${clean}`;
}
