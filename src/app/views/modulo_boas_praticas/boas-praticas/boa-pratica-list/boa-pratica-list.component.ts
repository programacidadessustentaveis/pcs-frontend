import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatPaginator } from '@angular/material';
import { AuthService } from 'src/app/services/auth.service';
//import { ActivatedRoute } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { BoaPraticaService } from 'src/app/services/boa-pratica.service';
import { BoaPratica } from 'src/app/model/boaPratica';
import { PcsUtil } from 'src/app/services/pcs-util.service';
import swal from 'sweetalert2';
import { IfStmt } from '@angular/compiler';


@Component({
  selector: 'app-boa-pratica-list',
  templateUrl: './boa-pratica-list.component.html',
  styleUrls: ['./boa-pratica-list.component.css']
})
export class BoaPraticaListComponent implements OnInit {

  @ViewChild(MatSort) sort: MatSort;
  
  loading = false;
  private isAdmin: boolean = false;
  private idPrefeituraLogada: number;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  public boaPratica: BoaPratica = new BoaPratica();

  public dataSource: MatTableDataSource<BoaPratica>;
  public displayedColumns: string[] = ['tipo', 'municipioNome', 'titulo', 'nomeResponsavel', 'dataPublicacao', 'acoes'];
  scrollUp: any;

  constructor(private boaPraticaService: BoaPraticaService, private authService: AuthService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private element: ElementRef) {
   this.scrollUp = this.router.events.subscribe((path) => {
   element.nativeElement.scrollIntoView();
   });
              }

  ngOnInit() {
    let usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));

    if(usuarioLogado.dadosPrefeitura != undefined) {
      this.idPrefeituraLogada = usuarioLogado.dadosPrefeitura.id;
    }
    for (let perfil of usuarioLogado.listaPerfil) {
      if ('Administrador' === perfil.nome) {
        this.isAdmin = true;
        break;
      }
    }

    this.buscarBoasPraticas();

    if (!this.hasRole('ROLE_EDITAR_BOA_PRATICA') && !this.hasRole('ROLE_DELETAR_BOA_PRATICA')){
      this.displayedColumns = ['municipioNome', 'titulo', 'dataPublicacao', 'nomeResponsavel'];
    }
  }

  public applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  private buscarBoasPraticas() {
    if (this.isUsuarioPrefeitura()) {
      this.displayedColumns = ['municipioNome', 'titulo', 'dataPublicacao', 'nomeResponsavel', 'acoes'];
      this.buscarBoasPraticasPorPrefeitura();
    } else {
      //this.buscarBoasPraticasPCS();
      this.buscarBoasPraticasGeral();
    }
  }

  public copiarBoaPratica(id: number) {

    PcsUtil.swal().fire({
      title: 'Deseja Continuar?',
      text: `Deseja realmente copiar a boa pr??tica selecionada?`,
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim',
      cancelButtonText: 'N??o',
      reverseButtons: false
    }).then((result) => {
      if (result.value) {
        // Busca a boa pratica
        if (id) {
          this.boaPraticaService.buscarPorId(id).subscribe(async response => {

            this.boaPratica = response as BoaPratica;
            this.boaPratica.id = null;
            this.boaPratica.tipo='PCS';
            this.boaPratica.idPrefeituraCadastro=null;

            // Insere a boa pr??tica copiada
            this.boaPraticaService.inserir(this.boaPratica).subscribe(async response => {
            await PcsUtil.swal().fire({
              title: 'Boa Pr??tica',
              text: `Boa Pr??tica copiada.`,
              type: 'success',
              showCancelButton: false,
              confirmButtonText: 'Ok',
            }).then((result) => {
              this.router.navigate(['/cadastro-boas-praticas']);
              this.buscarBoasPraticas();
            }, error => { });
        });

          }, error => {

            this.router.navigate(['/cadastro-boas-praticas']);

        });
        }

      }
    });


  }


  private buscarBoasPraticasPCS() {
    this.boaPraticaService.buscarBoasPraticasPCS().subscribe(response => {
      this.dataSource = new MatTableDataSource<BoaPratica>(response);
      this.paginator._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; };
      this.paginator._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator._intl.previousPageLabel = 'P??gina anterior';
      this.paginator._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator._intl.lastPageLabel = '??ltima p??gina';
      this.dataSource.paginator = this.paginator;
      this.dataSource.sortingDataAccessor = (item, property) => {
        if (property.includes('.')) return property.split('.').reduce((o,i)=>o[i], item)
        return item[property];
     };
      this.dataSource.sort = this.sort;
    }, error => { });
  }

  private buscarBoasPraticasGeral() {
    this.boaPraticaService.buscarBoasPraticasGeral().subscribe(response => {
      this.dataSource = new MatTableDataSource<BoaPratica>(response);
      this.paginator._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; };
      this.paginator._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator._intl.previousPageLabel = 'P??gina anterior';
      this.paginator._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator._intl.lastPageLabel = '??ltima p??gina';
      this.dataSource.paginator = this.paginator;
      this.dataSource.sortingDataAccessor = (item, property) => {
        if (property.includes('.')) return property.split('.').reduce((o,i)=>o[i], item)
        return item[property];
     };
      this.dataSource.sort = this.sort;
    }, error => { });
    
  }


  private buscarBoasPraticasPorPrefeitura() {
    this.boaPraticaService.buscarBoasPraticasPorPrefeitura(this.idPrefeituraLogada).subscribe(response => {
      this.dataSource = new MatTableDataSource<BoaPratica>(response);
      this.paginator._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; };
      this.paginator._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator._intl.previousPageLabel = 'P??gina anterior';
      this.paginator._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator._intl.lastPageLabel = '??ltima p??gina';
      this.dataSource.paginator = this.paginator;
      this.dataSource.sortingDataAccessor = (item, property) => {
        if (property.includes('.')) return property.split('.').reduce((o,i)=>o[i], item)
        return item[property];
     };
      this.dataSource.sort = this.sort;
    }, error => { });
  }

  public excluirBoaPratica(idBoaPratica: number): void {
    const swalWithBootstrapButtons = swal.mixin({
      confirmButtonClass: 'btn btn-success',
      cancelButtonClass: 'btn btn-danger',
      buttonsStyling: true,
    });

    PcsUtil.swal().fire({
      title: 'Deseja Continuar?',
      text: `Deseja realmente excluir a Boa Pr??tica selecionada?`,
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim',
      cancelButtonText: 'N??o',
      reverseButtons: false
    }).then((result) => {
      if (result.value) {
        this.boaPraticaService.excluirBoaPratica(idBoaPratica).subscribe(response => {
          PcsUtil.swal().fire('Exclu??do!', `Boa Pr??tica exclu??da.`, 'success');
          this.buscarBoasPraticas();
        });
      }
    });
  }

  public isUsuarioPrefeitura(): boolean {
    // tslint:disable-next-line: max-line-length
    return localStorage.getItem('usuarioLogado') != null && Boolean(JSON.parse(localStorage.getItem('usuarioLogado')).usuarioPrefeitura) === true;
  }

  public hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  podeEditar(item){
    if(this.hasRole('ROLE_EDITAR_BOA_PRATICA')){
      if(item.tipo ==='Prefeitura'){
        if(item.idPrefeituraCadastro === this.idPrefeituraLogada){
          return true;
        }
      } else{
        if (this.idPrefeituraLogada === null || this.idPrefeituraLogada === undefined ) {
          return true;
        }
      }
    }
    return false;
  }

  podeExcluir(item) {
    if (this.hasRole('ROLE_DELETAR_BOA_PRATICA')) {
      if(item.tipo ==='Prefeitura'){
        if(item.idPrefeituraCadastro === this.idPrefeituraLogada){
          return true;
        }
      } else{
        if (this.idPrefeituraLogada === null || this.idPrefeituraLogada === undefined) {
          return true;
        }
      }
    }
    return false;
  }

  podeCopiar(item){
    if (this.idPrefeituraLogada) {
      return false;
    } else {
      if (item.tipo !== 'Prefeitura') {
        return false;
      }
    }
    if (!this.isAdmin) {
      return false;
    }
    return true;
  }
}
