FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["EcomShop.API/EcomShop.API.csproj", "EcomShop.API/"]
RUN dotnet restore "EcomShop.API/EcomShop.API.csproj"
COPY . .
WORKDIR "/src/EcomShop.API"
RUN dotnet build "EcomShop.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "EcomShop.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "EcomShop.API.dll"]
