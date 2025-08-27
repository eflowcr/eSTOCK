all:
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web:v1.0.0 . --push
 
aluap:
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web_aluap:v1.0.0 . --push