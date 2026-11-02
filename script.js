(function(){


  var items=[], uid=0;


  var $=function(id){return document.getElementById(id)};


  var drop=$('drop'), file=$('file'), grid=$('grid'), panel=$('panel'), actions=$('actions'), status=$('status');


  document.body.dataset.step='1';


  function say(msg,err){status.textContent=msg;status.className=err?'err':''}


  function perPage(){return Number($('per').value)}



  /* ---------- choosing photos ---------- */
  drop.addEventListener('click',function(){file.click()});


  drop.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();file.click()}});


  $('add').addEventListener('click',function(){file.click()});


  ['dragenter','dragover'].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.add('over')})});


  ['dragleave','drop'].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.remove('over')})});

  drop.addEventListener('drop',function(e){addFiles(e.dataTransfer.files)});


  file.addEventListener('change',function(){addFiles(file.files);file.value=''});


  $('per').addEventListener('change',render);


  function addFiles(list){


    var arr=Array.prototype.slice.call(list).filter(function(f){return /^image\//.test(f.type)});


    if(!arr.length){say('Please choose image files (JPG, PNG or WebP).',true);return}


    arr.sort(function(a,b){return a.name.localeCompare(b.name,undefined,{numeric:true})});


    var pending=arr.length;


    arr.forEach(function(f){


      var url=URL.createObjectURL(f), img=new Image();


      img.onload=function(){


        items.push({id:++uid,name:f.name,img:img,rot:0,thumb:'',cap:''});


        done()


      };

      img.onerror=function(){say('Could not open '+f.name+'.',true);done()};


      img.src=url;


    });


    function done(){


      if(--pending===0){


        items.forEach(function(it){if(!it.thumb)it.thumb=draw(it,320).toDataURL('image/jpeg',.8)});


        render();


        say(items.length+' photo'+(items.length>1?'s':'')+' ready.');


      }

    }


  }


  /* draw one photo (with rotation) on a canvas, max side = maxSide px */
  function draw(it,maxSide){


    var w=it.img.naturalWidth,h=it.img.naturalHeight,sw=w,sh=h;


    if(it.rot%180!==0){sw=h;sh=w}


    var s=Math.min(1,maxSide/Math.max(sw,sh));


    var c=document.createElement('canvas'); c.width=Math.round(sw*s); c.height=Math.round(sh*s);


    var g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height);


    g.translate(c.width/2,c.height/2); g.rotate(it.rot*Math.PI/180);


    var dw=Math.round(w*s),dh=Math.round(h*s); g.drawImage(it.img,-dw/2,-dh/2,dw,dh);


    return c;

  }

  /* ---------- the cards on screen ---------- */
  var IC={


    l:'<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',


    r:'<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',


    rot:'<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5"/></svg>',


    del:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'};


  function render(){


    var per=perPage();


    grid.innerHTML='';


    items.forEach(function(it,i){


      var li=document.createElement('li'); li.className='card';


      var label=per===1?'Page '+(i+1):'Photo '+(i+1)+' · Page '+(Math.floor(i/per)+1);


      li.innerHTML='<div class="thumb"><img alt=""></div>'+


        '<div class="meta"><b></b><span class="nm"></span></div>'+


        '<div class="capwrap"><input class="cap" type="text" maxlength="120" placeholder="Add a caption (optional)" aria-label="Caption"></div>'+


        '<div class="tools"><button data-a="l" aria-label="Move earlier">'+IC.l+'</button><button data-a="r" aria-label="Move later">'+IC.r+'</button>'+

        '<button data-a="rot" aria-label="Rotate">'+IC.rot+'</button><button data-a="del" class="del" aria-label="Remove">'+IC.del+'</button></div>';

      li.querySelector('img').src=it.thumb;

      li.querySelector('.meta b').textContent=label;

      li.querySelector('.nm').textContent=it.name; li.querySelector('.nm').title=it.name;

      var cap=li.querySelector('.cap'); cap.value=it.cap;

      cap.addEventListener('input',function(){it.cap=cap.value});

      li.querySelector('[data-a=l]').disabled=i===0;

      li.querySelector('[data-a=r]').disabled=i===items.length-1;

      li.addEventListener('click',function(e){

        var bt=e.target.closest&&e.target.closest('button[data-a]'); if(!bt||bt.disabled)return;

        var a=bt.getAttribute('data-a'), k=items.indexOf(it);

        if(a==='l'&&k>0){items.splice(k-1,0,items.splice(k,1)[0])}

        if(a==='r'&&k<items.length-1){items.splice(k+1,0,items.splice(k,1)[0])}

        if(a==='rot'){it.rot=(it.rot+90)%360;it.thumb=draw(it,320).toDataURL('image/jpeg',.8)}

        if(a==='del'){items.splice(k,1)}

        render();

      });


      grid.appendChild(li);


    });


    var has=items.length>0; panel.classList.toggle('on',has); actions.hidden=!has;


    drop.style.display=has?'none':''; document.body.dataset.step=has?'2':'1';

    var pages=Math.ceil(items.length/per);

    $('count').textContent=items.length+' photo'+(items.length===1?'':'s')+' → '+pages+' page'+(pages===1?'':'s');

  }

  $('clear').addEventListener('click',function(){items=[];render();say('')});


  /* ---------- making the PDF ---------- */
  function dataToBytes(url){


    var b=atob(url.split(',')[1]),u=new Uint8Array(b.length);


    for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i); return u;


  }

  /* break a caption into lines that fit the width */


  function wrap(g,text,maxW,maxL){


    var words=text.split(/\s+/),lines=[],cur='';

    words.forEach(function(w){

      var test=cur?cur+' '+w:w;

      if(g.measureText(test).width<=maxW){cur=test;return}

      if(cur)lines.push(cur);

      while(g.measureText(w).width>maxW&&w.length>1){

        var i=w.length; while(i>1&&g.measureText(w.slice(0,i)).width>maxW)i--;

        lines.push(w.slice(0,i)); w=w.slice(i);

      }

      cur=w;

    });

    if(cur)lines.push(cur);

    if(lines.length>maxL){lines=lines.slice(0,maxL);lines[maxL-1]=lines[maxL-1].slice(0,-1)+'…'}

    return lines;
  }

  /* put one group of photos (+ captions) on one blank sheet */
  function composePage(group,pw,ph,m,cols,rows,per){

    var S=2.5, W=Math.round(pw*S), H=Math.round(ph*S);

    var c=document.createElement('canvas'); c.width=W; c.height=H;

    var g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,W,H);

    var mp=m*S, cw=(W-2*mp)/cols, ch=(H-2*mp)/rows, pad=per>1?8*S:0;

    var fs=(per<=2?12:per===4?10:9)*S, lh=fs*1.3;

    g.font=fs+'px Helvetica, Arial, sans-serif'; g.textAlign='center'; g.textBaseline='top'; g.fillStyle='#111';

    group.forEach(function(it,k){

      var cx=mp+(k%cols)*cw+pad, cy=mp+Math.floor(k/cols)*ch+pad, aw=cw-2*pad, ah=ch-2*pad;

      var lines=it.cap&&it.cap.trim()?wrap(g,it.cap.trim(),aw,3):[];

      var capH=lines.length?lines.length*lh+fs*.6:0;

      var im=draw(it,2000), room=Math.max(ah-capH,ah*.3);

      var s=Math.min(aw/im.width,room/im.height), dw=im.width*s, dh=im.height*s;

      var top=cy+(ah-(dh+capH))/2;

      g.drawImage(im,cx+(aw-dw)/2,top,dw,dh);

      lines.forEach(function(t,i){g.fillText(t,cx+aw/2,top+dh+fs*.6+i*lh)});

    });

    return c;

  }

  function buildPDF(pages){

    var enc=new TextEncoder(), chunks=[], len=0, offs=[];

    function put(x){var u=typeof x==='string'?enc.encode(x):x;chunks.push(u);len+=u.length}

    function num(n){return (Math.round(n*100)/100).toString()}

    put('%PDF-1.4\n');

    var total=2+pages.length*3;

    offs[1]=len; put('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    var kids=pages.map(function(p,i){return (3+i*3)+' 0 R'}).join(' ');

    offs[2]=len; put('2 0 obj\n<< /Type /Pages /Kids ['+kids+'] /Count '+pages.length+' >>\nendobj\n');

    pages.forEach(function(p,i){

      var pg=3+i*3, ct=pg+1, im=pg+2;

      offs[pg]=len;

      put(pg+' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+num(p.pw)+' '+num(p.ph)+'] /Resources << /XObject << /Im0 '+im+' 0 R >> >> /Contents '+ct+' 0 R >>\nendobj\n');


      var cs='q '+num(p.pw)+' 0 0 '+num(p.ph)+' 0 0 cm /Im0 Do Q';

      offs[ct]=len; put(ct+' 0 obj\n<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream\nendobj\n');

      offs[im]=len;

      put(im+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+p.w+' /Height '+p.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpg.length+' >>\nstream\n');

      put(p.jpg); put('\nendstream\nendobj\n');
      
    });

    var xr=len, x='xref\n0 '+(total+1)+'\n0000000000 65535 f \n';

    for(var i=1;i<=total;i++)x+=('0000000000'+offs[i]).slice(-10)+' 00000 n \n';

    put(x+'trailer\n<< /Size '+(total+1)+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF');

    return new Blob(chunks,{type:'application/pdf'});

  }


  $('make').addEventListener('click',function(){

    if(!items.length)return;

    var btn=$('make'); btn.disabled=true; say('Making your PDF…');

    setTimeout(function(){

      try{

        var sz=$('size').value.split(',').map(Number), mode=$('orient').value,

            m=Number($('margin').value), q=Number($('qual').value), per=perPage(), pages=[];

        for(var i=0;i<items.length;i+=per){


          var group=items.slice(i,i+per), land;


          if(per===1&&mode==='auto'){


            var it=group[0], sideways=it.rot%180!==0;


            land=sideways?it.img.naturalHeight>it.img.naturalWidth:it.img.naturalWidth>it.img.naturalHeight;

          }else{land=mode==='l'}

          var pw=land?sz[1]:sz[0], ph=land?sz[0]:sz[1];

          var cols=1, rows=1;

          if(per===2){cols=land?2:1;rows=land?1:2}


          if(per===4){cols=2;rows=2}


          if(per===6){cols=land?3:2;rows=land?2:3}


          var c=composePage(group,pw,ph,m,cols,rows,per);


          pages.push({jpg:dataToBytes(c.toDataURL('image/jpeg',q)),w:c.width,h:c.height,pw:pw,ph:ph});


        }


        var blob=buildPDF(pages);


        var nm=($('name').value||'my-notes').replace(/[\\\/:*?"<>|]+/g,'').trim()||'my-notes';


        var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nm+'.pdf';


        document.body.appendChild(a); a.click(); a.remove();


        document.body.dataset.step='3';


        say('Done! '+pages.length+' page'+(pages.length>1?'s':'')+', '+(blob.size/1048576).toFixed(2)+' MB. Check your Downloads.');


      }catch(e){say('Something went wrong. Try fewer photos or a smaller quality.',true)}


      btn.disabled=false;


    },50);

  });
  
})();
