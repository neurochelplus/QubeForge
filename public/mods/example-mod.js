// example-mod.js
// Пример мода для QubeForge

QubeForge.registerMod('example-mod', {
  name: 'Example Mod',
  version: '1.0.0',
  author: 'QubeForge Team',
  description: 'Демонстрационный мод с HUD и уведомлениями',
  apiVersion: '1.0',
  permissions: ['world.read', 'player.read', 'ui.hud'],
  dependencies: [],
}, {
  init(api) {
    // === HUD: Координаты игрока ===
    api.ui.addHUDElement('coords', {
      position: 'top-left',
      html: '<div>X: 0 Y: 0 Z: 0</div>',
    });

    // === HUD: Счётчик разрушенных блоков ===
    let blocksDestroyed = 0;
    api.ui.addHUDElement('counter', {
      position: 'top-right',
      html: '<div>Разрушено: 0</div>',
    });

    // === HUD: Статус здоровья ===
    api.ui.addHUDElement('health-status', {
      position: 'bottom-left',
      html: '<div style="color: #4f4;">❤ Здоровье в норме</div>',
    });

    // Обновление координат каждые 500мс
    setInterval(() => {
      const player = api.getPlayer();
      const pos = player.getPosition();
      if (pos) {
        api.ui.updateHUDElement('coords', { 
          html: `<div>X: ${pos.x.toFixed(0)} Y: ${pos.y.toFixed(0)} Z: ${pos.z.toFixed(0)}</div>`
        });
      }
    }, 500);

    // === События с визуальной обратной связью ===
    
    // Разрушение блока
    api.on('world:blockBreak', (event) => {
      blocksDestroyed++;
      api.ui.updateHUDElement('counter', {
        html: `<div>Разрушено: ${blocksDestroyed}</div>`
      });
      api.ui.showNotification(`Блок #${event.data.blockId} разрушен!`);
    });

    // Установка блока
    api.on('world:blockPlace', (event) => {
      api.ui.showNotification(`Блок #${event.data.blockId} установлен`);
    });

    // Получение урона
    api.on('player:damage', (event) => {
      const hp = event.data.newHp;
      const maxHp = event.data.maxHp;
      
      let color = '#4f4'; // зелёный
      let status = '❤ Здоровье в норме';
      
      if (hp <= 5) {
        color = '#f44';
        status = '💀 КРИТИЧЕСКОЕ ЗДОРОВЬЕ!';
        api.ui.showNotification('⚠️ Низкое здоровье!', 2000);
      } else if (hp <= 10) {
        color = '#ff4';
        status = '⚠ Здоровье низкое';
      }
      
      api.ui.updateHUDElement('health-status', {
        html: `<div style="color: ${color};">${status} (${hp}/${maxHp})</div>`
      });
    });

    // Убийство моба
    api.on('mob:death', (event) => {
      api.ui.showNotification(`🎯 ${event.data.mobType} убит!`, 2000);
    });
  },

  onEnable() {},
  onDisable() {},
});
