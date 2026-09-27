import { describe, expect, it } from 'vitest';
import { clearToken, getToken, setToken } from './index';

// token 读写是登录态的地基，直接对着 jsdom 的 localStorage 验证
describe('api token helpers', () => {
  it('初始无 token', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken 后 getToken 能读回', () => {
    setToken('abc.def.ghi');
    expect(getToken()).toBe('abc.def.ghi');
  });

  it('clearToken 后再次为空', () => {
    setToken('xyz');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
