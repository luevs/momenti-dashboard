-- Solo la primera consulta para ver los IDs largos restantes
SELECT 
    id,
    LENGTH(id) as longitud,
    razon_social
FROM customers_ 
WHERE LENGTH(id) > 3
ORDER BY id;