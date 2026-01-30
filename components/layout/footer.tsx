import { Badge } from "@/components/ui/badge";
import { GraduationCap, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo/logounamad.png"
                alt="UNAMAD Logo"
                width={32}
                height={32}
                className="rounded"
              />
              <span className="font-bold">Seguimiento de Tesis</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Plataforma integral para la gestión y seguimiento de tesis universitarias.
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">v1.0</Badge>
              <Badge variant="outline" className="text-xs">UNAMAD</Badge>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">Inicio</Link></li>
              <li><Link href="/#caracteristicas" className="hover:text-primary transition-colors">Características</Link></li>
              <li><Link href="/#proceso" className="hover:text-primary transition-colors">Proceso</Link></li>
              <li><Link href="/#testimonios" className="hover:text-primary transition-colors">Testimonios</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">Guía de Usuario</Link></li>
              <li><Link href="/#faq" className="hover:text-primary transition-colors">Preguntas Frecuentes</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Soporte Técnico</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Tutoriales</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
                <span>Universidad Nacional Amazónica de Madre de Dios</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>soporte@unamad.edu.pe</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 Seguimiento de Tesis - UNAMAD. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-primary transition-colors">Términos</Link>
            <Link href="#" className="hover:text-primary transition-colors">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
