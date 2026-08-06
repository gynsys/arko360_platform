# Refactorización de la UI de APU (ApuEditorUI)

## Objetivo
Unificar la interfaz de edición y visualización de Análisis de Precios Unitarios (APU) en todo el sistema. Anteriormente, la lógica de la tabla de insumos, cálculos directos e indirectos estaba duplicada en múltiples vistas (como `BudgetAPUEditorPage` y `AIApuGeneratorPage`), lo que dificultaba el mantenimiento y generaba inconsistencias visuales.

## Cambios Principales

1. **Creación del componente compartido `ApuEditorUI`**
   - **Ruta:** `admin/src/components/ApuEditorUI.jsx`
   - **Responsabilidad:** Renderizar de forma puramente visual (o "dumb component") el listado de Materiales, Equipos y Mano de Obra, así como calcular los totales (Subtotal A, B y Precio Unitario).
   - **Funciones:** Recibe a través de `props` la información (`item`, `settings`) y expone callbacks (`onComponentChange`, `onAddBlankRow`, `onRemoveRow`, etc.) para que la vista padre maneje el estado y la persistencia de forma independiente.
   - **Mejoras:** Soporte nativo para editar los porcentajes de Administración y Utilidad de forma local mediante la prop opcional `onSettingsChange`, útil para APUs huérfanos o personalizados.

2. **Refactorización de `BudgetAPUEditorPage`**
   - **Ruta:** `admin/src/pages/admin/BudgetAPUEditorPage.jsx`
   - **Cambio:** Se eliminó toda la estructura HTML estática (tablas de insumos) y se delegó el renderizado a `<ApuEditorUI />`.
   - **Beneficios:** El autoguardado en tiempo real (al perder el foco `onBlur` o al cambiar un valor) se mantuvo intacto, pero el código de la vista se redujo significativamente (de más de 800 líneas a ~300).

3. **Refactorización de `AIApuGeneratorPage`**
   - **Ruta:** `admin/src/modules/cost360/pages/AIApuGeneratorPage.jsx`
   - **Cambio:** Sustitución de la tabla manual por `<ApuEditorUI />`.
   - **Beneficios:** Los APUs generados por IA o importados como base ahora se visualizan e interactúan exactamente igual que los APUs presupuestados.

## Persistencia de Datos
El componente UI interactúa transparentemente con el backend:
- En `BudgetAPUEditorPage`, se comunican los cambios a las tablas de presupuestos mediante `crud_budgets.py`.
- En `AIApuGeneratorPage`, al pulsar "Guardar APU", se envía un payload JSON que persiste en `CustomCostItem` mediante `crud_cost360.py`. El uso de `ApuEditorUI` no interfiere con esta estructura, ya que respeta los esquemas `materials`, `equipments`, `labors` del modelo Pydantic del backend.

## Correcciones Secundarias
Durante la migración, se solucionaron errores de etiquetas HTML no balanceadas (`Unexpected end of file before a closing "div" tag`) derivadas de la eliminación manual de bloques de código en los *returns* de React. Todo validado exitosamente en el proceso de build.
