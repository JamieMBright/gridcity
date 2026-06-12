import { expect, test } from '@playwright/test';
import { boot, clickButton, store } from './helpers';

interface Case {
  button: string | RegExp;
  tool: string;
}

const TOOL_CASES: Case[] = [
  { button: 'Gas CCGT', tool: '{"t":"gen","gen":"gasCCGT"}' },
  { button: 'Solar farm', tool: '{"t":"gen","gen":"solarFarm"}' },
  { button: 'Onshore wind', tool: '{"t":"gen","gen":"windOnshore"}' },
  { button: 'Offshore wind', tool: '{"t":"gen","gen":"windOffshore"}' },
  { button: 'Nuclear', tool: '{"t":"gen","gen":"nuclear"}' },
  { button: 'Battery storage', tool: '{"t":"gen","gen":"battery"}' },
  { button: 'Bulk supply point', tool: '{"t":"sub","sub":"bulk"}' },
  { button: 'Grid substation', tool: '{"t":"sub","sub":"grid"}' },
  { button: 'Distribution substation', tool: '{"t":"sub","sub":"dist"}' },
  { button: 'Field depot', tool: '{"t":"depot"}' },
  { button: 'Demolish', tool: '{"t":"demolish"}' },
];

test.describe('build palette', () => {
  // force: true skips Playwright's element-stability wait, which is slow
  // while the Pixi canvas repaints under software WebGL
  for (const c of TOOL_CASES) {
    test(`"${String(c.button)}" arms its tool and toggles back to inspect`, async ({ page }) => {
      await boot(page);
      await clickButton(page, c.button);
      await expect
        .poll(() => store<string>(page, '(s) => JSON.stringify(s.tool)'))
        .toBe(c.tool);
      // clicking the active tool disarms it
      await clickButton(page, c.button);
      await expect
        .poll(() => store<string>(page, '(s) => JSON.stringify(s.tool)'))
        .toBe('{"t":"inspect"}');
    });
  }

  test('line tools arm each voltage level', async ({ page }) => {
    await boot(page);
    for (const level of [400, 132, 33]) {
      await clickButton(page, `${level} kV line`);
      await expect.poll(() => store<number>(page, '(s) => s.tool.level')).toBe(level);
      await expect(
        page.getByText('click a ringed asset to start the route'),
      ).toBeVisible();
    }
  });

  test('overhead/underground toggle switches the line build', async ({ page }) => {
    await boot(page);
    await clickButton(page, 'underground', true);
    await expect.poll(() => store<string>(page, '(s) => s.tool.build')).toBe('underground');
    await expect(page.getByRole('button', { name: '132 kV cable' })).toBeVisible();
    await clickButton(page, 'overhead');
    await expect.poll(() => store<string>(page, '(s) => s.tool.build')).toBe('overhead');
    await expect(page.getByRole('button', { name: '132 kV line' })).toBeVisible();
  });

  test('Escape returns to inspect', async ({ page }) => {
    await boot(page);
    await clickButton(page, 'Demolish');
    await expect.poll(() => store<string>(page, '(s) => s.tool.t')).toBe('demolish');
    await page.keyboard.press('Escape');
    await expect.poll(() => store<string>(page, '(s) => s.tool.t')).toBe('inspect');
  });
});
