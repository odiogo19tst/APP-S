# Assinatura permanente do Grauê XPS

applicationId: br.com.dodigital.copilotoxps
Certificado SHA-256: 0236ff9f602daa3ad99c90b66fcf7bedc363dd511e8d4f2f51b6181081aa127f
Alias: graue-xps

A chave permanente está no arquivo privado Graue_XPS_SIGNING_PRIVATE_NOVA.zip da conta do proprietário. Nunca gerar outra chave para uma atualização. Nunca copiar o material privado para o GitHub ou incluí-lo no APK.

O GitHub Actions produz APK SEM ASSINATURA (artifact UNSIGNED). Não distribuir diretamente esse arquivo. Assinar a entrega com o keystore permanente e verificar que o certificado corresponde ao SHA-256 acima. Se a chave não estiver acessível, recuperar o arquivo privado; não substituir por debug key.

Os APKs 1.28 e 1.29 usavam certificados Android Debug diferentes em cada execução. As chaves temporárias não foram guardadas. A atualização da compilação #219 foi instalada com sucesso pelo proprietário usando esta chave. As próximas compilações devem reutilizar exatamente o mesmo JKS e incrementar versionCode (após v1.30.1/code 46). Fazer backup de repertórios e kits antes de instalar versões novas. Nunca publicar o keystore, sua senha ou seu arquivo ZIP no GitHub.

Comando (senha somente por arquivo privado, nunca argumento literal):

```bash
scripts/sign-apk.sh UNSIGNED_APK KEYSTORE PASSWORD_FILE APKSIGNER_JAR OUTPUT_APK
```
