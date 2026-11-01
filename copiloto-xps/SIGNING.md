# Assinatura permanente do Grauê XPS

applicationId: br.com.dodigital.copilotoxps
Certificado SHA-256: 45503b3d4af96f18aae2c8d012ddd246bcc113dd889fdaaaf0e8486252cc6c82
Alias: graue-xps

A chave permanente está no arquivo privado Graue_XPS_SIGNING_PRIVATE.zip da conta do proprietário. Nunca gerar outra chave para uma atualização. Nunca copiar o material privado para o GitHub ou incluí-lo no APK.

O GitHub Actions produz APK SEM ASSINATURA (artifact UNSIGNED). Não distribuir diretamente esse arquivo. Assinar a entrega com o keystore permanente e verificar que o certificado corresponde ao SHA-256 acima. Se a chave não estiver acessível, recuperar o arquivo privado; não substituir por debug key.

Os APKs 1.28 e 1.29 usavam certificados Android Debug diferentes em cada execução. As chaves temporárias não foram guardadas. A primeira instalação com a chave permanente exige reinstalação; antes disso, usar a versão anterior para exportar repertório e kits e guardar os backups originais. As atualizações posteriores devem usar a mesma chave permanente e versionCode crescente.

Comando (senha somente por arquivo privado, nunca argumento literal):

```bash
scripts/sign-apk.sh UNSIGNED_APK KEYSTORE PASSWORD_FILE APKSIGNER_JAR OUTPUT_APK
```
