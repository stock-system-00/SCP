
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingDown, AlertCircle, Package, Activity } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function SummaryCards({ summary }: { summary: any }) {
  return (
    <div className="w-full relative">
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          <CarouselItem className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
            <Card className="shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Custo Total de Perda
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalCusto)}
                </div>
              </CardContent>
            </Card>
          </CarouselItem>

          <CarouselItem className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
            <Card className="shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Perda em Vendas
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary.totalVenda)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margem de{" "}
                  {Number(summary.margemPerda).toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </p>
              </CardContent>
            </Card>
          </CarouselItem>

          <CarouselItem className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
            <Card className="shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Itens
                </CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(summary.totalQtd).toLocaleString("pt-BR", {
                    maximumFractionDigits: 3,
                  })}
                </div>
              </CardContent>
            </Card>
          </CarouselItem>

          <CarouselItem className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
            <Card className="shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Média Diária
                </CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(summary.mediaQtdDia).toLocaleString("pt-BR", {
                    maximumFractionDigits: 3,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  itens / dia no período
                </p>
              </CardContent>
            </Card>
          </CarouselItem>
        </CarouselContent>
        <div className="hidden sm:block">
          <CarouselPrevious className="-left-12" />
          <CarouselNext className="-right-12" />
        </div>
      </Carousel>
    </div>
  );
}
