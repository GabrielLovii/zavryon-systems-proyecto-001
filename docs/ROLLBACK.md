# Procedimiento seguro de rollback

Este procedimiento evita reescrituras destructivas y no requiere exponer secretos. **Nunca** pegues claves, tokens, valores de `.env.local` ni cabeceras privadas en comandos, issues, logs o capturas.

## 1. Identificar el último estado conocido bueno

1. Abrir `docs/PROJECT-LOG.md` y localizar la última entrada con despliegue verificado.
2. Confirmar el commit en GitHub y localmente:

   ```bash
   git fetch origin
   git show --no-patch --format=fuller <commit-conocido-bueno>
   git log --oneline --decorate -10
   ```

3. Para el estado documentado actual, `f92fac5e` es el despliegue verificado y `f76af2c` es el baseline anterior. No asumir que una referencia es buena sin comparar con el historial y el comportamiento observado.

## 2. Revertir de forma segura en Git

1. Detener el reporte de completado y registrar el incidente y el commit afectado.
2. Crear una rama de recuperación desde `main` actualizado:

   ```bash
   git switch main
   git pull --ff-only origin main
   git switch -c rollback/<breve-motivo>
   ```

3. Revertir el commit o rango, sin borrar ni reescribir historial:

   ```bash
   git revert --no-edit <commit-afectado>
   # Para varios commits, seleccionar el rango revisado y resolver conflictos manualmente.
   git push -u origin rollback/<breve-motivo>
   ```

4. Ejecutar el workflow de calidad y revisar el diff. Abrir el PR habitual hacia `main`; no usar `git reset --hard` ni force-push en `main`.
5. Añadir la entrada correspondiente en `docs/PROJECT-LOG.md` antes de comunicar la recuperación.

## 3. Recuperar el deployment en Vercel

1. En el proyecto correcto de Vercel, abrir **Deployments** y localizar el deployment asociado al commit conocido bueno.
2. Verificar proyecto, rama, commit y dominio antes de actuar.
3. Usar **Promote to Production** o **Rollback** sobre ese deployment según la opción disponible en el equipo. No crear ni copiar tokens en la documentación.
4. Esperar el estado listo, comprobar la URL de producción y realizar la comprobación funcional mínima.
5. Recordar que el rollback de Vercel cambia el artefacto servido; el repositorio debe quedar corregido mediante el `git revert` para que el siguiente despliegue no reintroduzca el problema.

## 4. Recuperación y notas

- Si hay conflicto al revertir, parar, conservar el estado de la rama y pedir revisión; no resolver eliminando cambios sin inspeccionar.
- Si el deployment bueno no aparece, usar el commit documentado como referencia y desplegar desde la rama de rollback después de pasar calidad.
- Si el problema afecta datos de Supabase, no ejecutar SQL destructivo. Pausar y solicitar un respaldo/procedimiento específico del proyecto.
- La demo principal usa `localStorage`; el rollback de Vercel no restaura datos locales ya modificados en cada navegador.
- Tras recuperar, registrar síntoma, commit, deployment, pruebas, causa conocida y siguiente acción en `PROJECT-LOG.md`.
