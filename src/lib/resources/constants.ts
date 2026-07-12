export const CLOUD_LABELS: Record<string, string> = {
  quark: '夸克',
  baidu: '百度',
  aliyun: '阿里云',
  onedrive: 'OneDrive',
  pcloud: 'pCloud',
  mediafire: 'MediaFire',
  wetransfer: 'WeTransfer',
  box: 'Box',
  dropbox: 'Dropbox',
  gdrive: 'Google Drive',
  mega: 'MEGA',
  '115': '115网盘',
  tianyi: '天翼云盘',
  weiyun: '微云',
  lanzou: '蓝奏云',
  ctfile: '城通网盘',
  nutstore: '坚果云',
  xunlei: '迅雷网盘',
  guangya: '光鸭网盘',
};

export function getCloudLabel(cloudType: string): string {
  return CLOUD_LABELS[cloudType] ?? cloudType;
}
