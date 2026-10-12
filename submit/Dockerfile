FROM golang:1.27-alpine@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN go vet ./... && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/submit .

FROM gcr.io/distroless/static-debian13:nonroot@sha256:e2e927ec666bae08560abb3c55d0659eceabb657f56b6782ab500a9fc7f555e3
COPY --from=build /out/submit /submit
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/submit"]
