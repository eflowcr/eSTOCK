all:
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web:v4.20.0.3-DEMO . --push
 
aluap:
	docker buildx build --platform linux/amd64 -t epracsupply/estock_web_aluap:v4.20.0.3-ALUAP . --push

	