import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { NotificationInstance } from 'antd/es/notification/interface';

/**
 * 全站反馈统一入口。
 * 通过 AntD v5 的 <App> + App.useApp() 拿到 message/modal/notification 实例，
 * 避免 React 19 下静态方法（message.error / Modal.confirm）的 context 警告。
 *
 * 用法：
 *   <App><FeedbackInit /> ... </App>
 * 然后任意位置 `import { showSuccess, showError, ... } from '@/utils/feedback'`。
 */
let messageApi: MessageInstance | undefined;
let modalApi: Omit<ModalStaticFunctions, 'warn'> | undefined;
let notifyApi: NotificationInstance | undefined;

/** 挂在 <App> 内部，把 App.useApp() 的实例注入到模块作用域 */
export function FeedbackInit() {
  const app = App.useApp();
  messageApi = app.message;
  modalApi = app.modal;
  notifyApi = app.notification;
  return null;
}

const NOOP = () => {
  // 兜底：FeedbackInit 未挂载前调用时不至于崩，只在开发环境提示
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('[feedback] AntD <App> 未包裹，反馈被丢弃');
  }
};

export function showSuccess(text: string): void {
  (messageApi?.success ?? NOOP)(text);
}

export function showError(text: string): void {
  (messageApi?.error ?? NOOP)(text);
}

export function showWarning(text: string): void {
  (messageApi?.warning ?? NOOP)(text);
}

/** 权限不足统一文案 */
export function showForbidden(text = '无权执行该操作'): void {
  (messageApi?.warning ?? NOOP)(text);
}

/** AntD Modal.confirm 包装（替换静态方法） */
export function confirmModal(
  options: Parameters<NonNullable<typeof modalApi>['confirm']>[0],
): void {
  if (modalApi) modalApi.confirm(options);
  else NOOP();
}

/** 需停留的错误通知（如后台轮询失败） */
export function notifyError(text: string, description?: string): void {
  (notifyApi?.error ?? NOOP)({ message: text, description });
}
